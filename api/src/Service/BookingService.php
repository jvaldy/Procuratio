<?php

namespace App\Service;

use App\Entity\Appointment;
use App\Entity\AppointmentService;
use App\Entity\AppointmentStatusHistory;
use App\Entity\BookingSession;
use App\Entity\Customer;
use App\Entity\Employee;
use App\Entity\Service;
use App\Entity\Store;
use App\Repository\AppointmentRepository;
use App\Repository\BusinessHourRepository;
use App\Repository\EmployeeAvailabilityRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class BookingService
{
    private const CANCELLATION_MIN_HOURS = 24;
    private const RESCHEDULE_MIN_HOURS = 12;
    private const BUSINESS_TIMEZONE = 'Europe/Paris';
    private const MSG_APPOINTMENT_NOT_FOUND = 'Appointment not found.';
    private const MSG_BOOKING_SESSION_ALREADY_PROCESSED = 'This booking session has already been processed.';
    private const MSG_BOOKING_SESSION_EXPIRED = 'This booking session has expired.';
    private const MSG_CANCELLATION_TOO_LATE = 'Cancellation is no longer allowed within 24 hours of the appointment.';
    private const MSG_INVALID_PAYMENT_MODE = 'Invalid paymentMode. Allowed values: in_store, online.';
    private const MSG_MINIMUM_BOOKING_NOTICE = 'Online appointments must be booked at least 30 minutes in advance.';
    private const MSG_RESCHEDULE_TOO_LATE = 'Rescheduling is no longer allowed within 12 hours of the appointment.';
    private const MSG_SCHEDULED_APPOINTMENTS_ONLY = 'Only scheduled appointments can be rescheduled.';
    private const MSG_UNCANCELLABLE_APPOINTMENT = 'This appointment can no longer be cancelled.';

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly AppointmentRepository $appointmentRepository,
        private readonly EmployeeAvailabilityRepository $availabilityRepository,
        private readonly BusinessHourRepository $businessHourRepository,
        private readonly PlanningValidator $planningValidator,
    ) {
    }

    /**
     * @return array<int, array{startAt: string, endAt: string, employee: array{id:int,name:string}}>
     */
    public function listPublicSlots(Service $service, \DateTimeImmutable $from, \DateTimeImmutable $to, ?Employee $employee = null, ?Store $store = null): array
    {
        if ($employee) {
            $employees = [$employee];
        } else {
            $qb = $this->em->getRepository(Employee::class)->createQueryBuilder('e')
                ->where('e.status = :status')
                ->andWhere('e.isBookable = :bookable')
                ->setParameter('status', 'active')
                ->setParameter('bookable', true)
                ->orderBy('e.fullName', 'ASC');
            if ($store instanceof Store) {
                $qb->andWhere('e.store = :store')->setParameter('store', $store);
            }
            $employees = $qb->getQuery()->getResult();
        }
        $duration = max(5, $service->getDurationMinutes());
        $slots = [];
        $bookingThreshold = new \DateTimeImmutable('+30 minutes', new \DateTimeZone(self::BUSINESS_TIMEZONE));

        foreach ($employees as $item) {
            $cursor = $from->setTime(0, 0);
            while ($cursor < $to) {
                $dayOfWeek = (int) $cursor->format('N');
                $businessHour = $this->businessHourRepository->findForDay($dayOfWeek, $item->getStore() ?? $store);
                if (!$businessHour || !$businessHour->isOpen()) {
                    $cursor = $cursor->modify('+1 day');
                    continue;
                }

                $windows = $this->availabilityRepository->findForEmployeeAndDay($item, $dayOfWeek);
                $businessStart = $cursor->setTime(
                    (int) $businessHour->getStartTime()->format('H'),
                    (int) $businessHour->getStartTime()->format('i')
                );
                $businessEnd = $cursor->setTime(
                    (int) $businessHour->getEndTime()->format('H'),
                    (int) $businessHour->getEndTime()->format('i')
                );

                foreach ($windows as $window) {
                    if (!$window->isAvailable()) {
                        continue;
                    }

                    $windowStart = $cursor->setTime(
                        (int) $window->getStartTime()->format('H'),
                        (int) $window->getStartTime()->format('i')
                    );
                    $windowEnd = $cursor->setTime(
                        (int) $window->getEndTime()->format('H'),
                        (int) $window->getEndTime()->format('i')
                    );
                    if ($windowStart < $businessStart) {
                        $windowStart = $businessStart;
                    }
                    if ($windowEnd > $businessEnd) {
                        $windowEnd = $businessEnd;
                    }
                    if ($windowEnd <= $windowStart) {
                        continue;
                    }

                    for ($start = $windowStart; $start < $windowEnd; $start = $start->modify('+30 minutes')) {
                        $end = $start->modify(sprintf('+%d minutes', $duration));
                        if ($end > $windowEnd || $start < $from || $end > $to) {
                            continue;
                        }

                        // Web checkout only exposes slots that can still be confirmed.
                        if ($start <= $bookingThreshold) {
                            continue;
                        }

                        if ($this->isBlockedByUnavailableWindow($windows, $start, $end)) {
                            continue;
                        }

                        if (!$this->appointmentRepository->hasConflict($item, $start, $end)) {
                            $slots[] = [
                                'startAt' => $this->formatCalendarDateTime($start),
                                'endAt' => $this->formatCalendarDateTime($end),
                                'employee' => ['id' => (int) $item->getId(), 'name' => $item->getFullName()],
                            ];
                        }
                    }
                }

                $cursor = $cursor->modify('+1 day');
            }
        }

        usort($slots, static function (array $a, array $b): int {
            $byStart = strcmp($a['startAt'], $b['startAt']);
            if ($byStart !== 0) {
                return $byStart;
            }

            return strcmp($a['employee']['name'], $b['employee']['name']);
        });
        return $slots;
    }

    private function formatCalendarDateTime(\DateTimeImmutable $dateTime): string
    {
        // Salon times stay in local wall-clock format so the UI shows the same hour the staff expects.
        return $dateTime->format('Y-m-d\TH:i:s');
    }

    /**
     * @param array<int, \App\Entity\EmployeeAvailability> $windows
     */
    private function isBlockedByUnavailableWindow(array $windows, \DateTimeImmutable $start, \DateTimeImmutable $end): bool
    {
        $slotStart = $start->format('H:i:s');
        $slotEnd = $end->format('H:i:s');

        foreach ($windows as $window) {
            if ($window->isAvailable()) {
                continue;
            }

            $windowStart = $window->getStartTime()->format('H:i:s');
            $windowEnd = $window->getEndTime()->format('H:i:s');
            if ($slotStart < $windowEnd && $slotEnd > $windowStart) {
                return true;
            }
        }

        return false;
    }

    public function openBookingSession(
        Customer $customer,
        Employee $employee,
        Service $service,
        \DateTimeImmutable $startAt,
        string $paymentMode
    ): BookingSession {
        $this->assertBookingWindow($startAt);
        $endAt = $startAt->modify(sprintf('+%d minutes', max(5, $service->getDurationMinutes())));
        $this->planningValidator->assertNoConflict($employee, $startAt, $endAt, null);
        $this->planningValidator->assertCustomerAvailability($customer, $startAt, $endAt, null);
        $this->planningValidator->assertWithinAvailability($employee, $startAt, $endAt);

        $session = (new BookingSession())
            ->setSessionToken(bin2hex(random_bytes(16)))
            ->setCustomer($customer)
            ->setEmployee($employee)
            ->setService($service)
            ->setStartAt($startAt)
            ->setEndAt($endAt)
            ->setPaymentMode($this->sanitizePaymentMode($paymentMode))
            ->setPaymentStatus(Appointment::PAYMENT_STATUS_PENDING)
            // Keep the slot hold short while the customer is still in checkout.
            ->setExpiresAt((new \DateTimeImmutable())->modify('+15 minutes'))
            ->setStatus(BookingSession::STATUS_OPEN);
        $session->touch();

        $this->em->persist($session);
        $this->em->flush();

        return $session;
    }

    public function confirmBookingSession(BookingSession $session, ?string $notes = null): Appointment
    {
        if ($session->getStatus() !== BookingSession::STATUS_OPEN) {
            throw new BadRequestHttpException(self::MSG_BOOKING_SESSION_ALREADY_PROCESSED);
        }
        if ($session->getExpiresAt() < new \DateTimeImmutable()) {
            $session->setStatus(BookingSession::STATUS_EXPIRED)->touch();
            $this->em->flush();
            throw new BadRequestHttpException(self::MSG_BOOKING_SESSION_EXPIRED);
        }

        $appointment = $this->em->getConnection()->transactional(function () use ($session, $notes) {
            $employee = $session->getEmployee();
            $this->planningValidator->assertNoConflict($employee, $session->getStartAt(), $session->getEndAt(), null);
            $this->planningValidator->assertCustomerAvailability($session->getCustomer(), $session->getStartAt(), $session->getEndAt(), null);
            $this->planningValidator->assertWithinAvailability($employee, $session->getStartAt(), $session->getEndAt());

            $appointment = (new Appointment())
                ->setEmployee($employee)
                ->setStore($employee->getStore())
                ->setCustomer($session->getCustomer())
                ->setStatus(Appointment::STATUS_SCHEDULED)
                ->setStartAt($session->getStartAt())
                ->setEndAt($session->getEndAt())
                ->setNotes($notes ? trim($notes) : null)
                ->setBookingSource(Appointment::SOURCE_WEB)
                ->setPaymentMode($session->getPaymentMode())
                ->setPaymentStatus($session->getPaymentStatus());

            $line = (new AppointmentService())
                ->setService($session->getService())
                ->setQuantity(1)
                ->setDurationMinutes($session->getService()->getDurationMinutes())
                ->setUnitPrice(number_format((float) $session->getService()->getPrice(), 2, '.', ''));
            $appointment->addService($line);

            $session->setStatus(BookingSession::STATUS_CONFIRMED)
                ->setAppointment($appointment)
                ->touch();

            $this->em->persist($appointment);
            $this->writeHistory(
                $appointment,
                null,
                Appointment::STATUS_SCHEDULED,
                'customer',
                'Online booking confirmed.'
            );
            $this->em->flush();

            return $appointment;
        });

        return $appointment;
    }

    public function rescheduleCustomerAppointment(
        Appointment $appointment,
        Customer $customer,
        Employee $employee,
        \DateTimeImmutable $startAt
    ): Appointment {
        $this->assertAppointmentOwnership($appointment, $customer);
        if ($appointment->getStatus() !== Appointment::STATUS_SCHEDULED) {
            throw new BadRequestHttpException(self::MSG_SCHEDULED_APPOINTMENTS_ONLY);
        }
        if ($appointment->getStartAt() <= (new \DateTimeImmutable())->modify(sprintf('+%d hours', self::RESCHEDULE_MIN_HOURS))) {
            throw new BadRequestHttpException(self::MSG_RESCHEDULE_TOO_LATE);
        }

        $duration = max(5, (int) array_reduce(
            $appointment->getServices()->toArray(),
            fn(int $sum, AppointmentService $line) => $sum + $line->getDurationMinutes(),
            0
        ));
        $endAt = $startAt->modify(sprintf('+%d minutes', $duration));
        $this->planningValidator->assertNoConflict($employee, $startAt, $endAt, $appointment->getId());
        $this->planningValidator->assertCustomerAvailability($customer, $startAt, $endAt, $appointment->getId());
        $this->planningValidator->assertWithinAvailability($employee, $startAt, $endAt);

        $oldStatus = $appointment->getStatus();
        $appointment
            ->setEmployee($employee)
            ->setStore($employee->getStore())
            ->setStartAt($startAt)
            ->setEndAt($endAt)
            ->touch();

        $this->writeHistory($appointment, $oldStatus, $appointment->getStatus(), 'customer', 'Rescheduled from the customer area.');
        $this->em->flush();
        return $appointment;
    }

    public function cancelCustomerAppointment(Appointment $appointment, Customer $customer, ?string $reason = null): Appointment
    {
        $this->assertAppointmentOwnership($appointment, $customer);
        if ($appointment->getStatus() !== Appointment::STATUS_SCHEDULED) {
            throw new BadRequestHttpException(self::MSG_UNCANCELLABLE_APPOINTMENT);
        }
        if ($appointment->getStartAt() <= (new \DateTimeImmutable())->modify(sprintf('+%d hours', self::CANCELLATION_MIN_HOURS))) {
            throw new BadRequestHttpException(self::MSG_CANCELLATION_TOO_LATE);
        }

        $from = $appointment->getStatus();
        $appointment->setStatus(Appointment::STATUS_CANCELLED)->touch();
        $this->writeHistory($appointment, $from, Appointment::STATUS_CANCELLED, 'customer', $reason ?: 'Cancelled by the customer.');
        $this->em->flush();

        return $appointment;
    }

    public function writeHistory(
        Appointment $appointment,
        ?string $fromStatus,
        string $toStatus,
        string $changedBy,
        ?string $reason = null
    ): void {
        $history = (new AppointmentStatusHistory())
            ->setAppointment($appointment)
            ->setCustomer($appointment->getCustomer())
            ->setFromStatus($fromStatus)
            ->setToStatus($toStatus)
            ->setChangedBy($changedBy)
            ->setReason($reason);
        $this->em->persist($history);
    }

    private function assertBookingWindow(\DateTimeImmutable $startAt): void
    {
        if ($startAt <= (new \DateTimeImmutable())->modify('+30 minutes')) {
            throw new BadRequestHttpException(self::MSG_MINIMUM_BOOKING_NOTICE);
        }
    }

    private function sanitizePaymentMode(string $paymentMode): string
    {
        if (!in_array($paymentMode, [Appointment::PAYMENT_MODE_IN_STORE, Appointment::PAYMENT_MODE_ONLINE], true)) {
            throw new BadRequestHttpException(self::MSG_INVALID_PAYMENT_MODE);
        }

        return $paymentMode;
    }

    private function assertAppointmentOwnership(Appointment $appointment, Customer $customer): void
    {
        if (!$appointment->getCustomer() || $appointment->getCustomer()->getId() !== $customer->getId()) {
            throw new NotFoundHttpException(self::MSG_APPOINTMENT_NOT_FOUND);
        }
    }
}
