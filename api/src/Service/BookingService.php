<?php

namespace App\Service;

use App\Entity\Appointment;
use App\Entity\AppointmentService;
use App\Entity\AppointmentStatusHistory;
use App\Entity\BookingSession;
use App\Entity\Customer;
use App\Entity\Employee;
use App\Entity\Service;
use App\Repository\AppointmentRepository;
use App\Repository\EmployeeAvailabilityRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class BookingService
{
    private const CANCELLATION_MIN_HOURS = 24;
    private const RESCHEDULE_MIN_HOURS = 12;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly AppointmentRepository $appointmentRepository,
        private readonly EmployeeAvailabilityRepository $availabilityRepository,
        private readonly PlanningValidator $planningValidator,
    ) {
    }

    /**
     * @return array<int, array{startAt: string, endAt: string, employee: array{id:int,name:string}}>
     */
    public function listPublicSlots(Service $service, \DateTimeImmutable $from, \DateTimeImmutable $to, ?Employee $employee = null): array
    {
        $employees = $employee ? [$employee] : $this->em->getRepository(Employee::class)->findBy([], ['fullName' => 'ASC']);
        $duration = max(5, $service->getDurationMinutes());
        $slots = [];

        foreach ($employees as $item) {
            $cursor = $from->setTime(0, 0);
            while ($cursor < $to) {
                $dayOfWeek = (int) $cursor->format('N');
                $windows = $this->availabilityRepository->findForEmployeeAndDay($item, $dayOfWeek);

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

                    for ($start = $windowStart; $start < $windowEnd; $start = $start->modify('+30 minutes')) {
                        $end = $start->modify(sprintf('+%d minutes', $duration));
                        if ($end > $windowEnd || $start < $from || $end > $to) {
                            continue;
                        }

                        if (!$this->appointmentRepository->hasConflict($item, $start, $end)) {
                            $slots[] = [
                                'startAt' => $start->format(DATE_ATOM),
                                'endAt' => $end->format(DATE_ATOM),
                                'employee' => ['id' => (int) $item->getId(), 'name' => $item->getFullName()],
                            ];
                        }
                    }
                }

                $cursor = $cursor->modify('+1 day');
            }
        }

        usort($slots, fn(array $a, array $b) => strcmp($a['startAt'], $b['startAt']));
        return array_slice($slots, 0, 300);
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
            // Une session courte limite le risque de prise en otage d'un creneau pendant le tunnel web.
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
            throw new BadRequestHttpException('Session de reservation deja traitee.');
        }
        if ($session->getExpiresAt() < new \DateTimeImmutable()) {
            $session->setStatus(BookingSession::STATUS_EXPIRED)->touch();
            $this->em->flush();
            throw new BadRequestHttpException('Session de reservation expiree.');
        }

        $appointment = $this->em->getConnection()->transactional(function () use ($session, $notes) {
            $employee = $session->getEmployee();
            $this->planningValidator->assertNoConflict($employee, $session->getStartAt(), $session->getEndAt(), null);
            $this->planningValidator->assertWithinAvailability($employee, $session->getStartAt(), $session->getEndAt());

            $appointment = (new Appointment())
                ->setEmployee($employee)
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
                ->setDurationMinutes($session->getService()->getDurationMinutes());
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
                'Reservation en ligne confirmee.'
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
            throw new BadRequestHttpException('Seuls les rendez-vous planifies peuvent etre reprogrammes.');
        }
        if ($appointment->getStartAt() <= (new \DateTimeImmutable())->modify(sprintf('+%d hours', self::RESCHEDULE_MIN_HOURS))) {
            throw new BadRequestHttpException('Replanification non autorisee a moins de 12 heures du rendez-vous.');
        }

        $duration = max(5, (int) array_reduce(
            $appointment->getServices()->toArray(),
            fn(int $sum, AppointmentService $line) => $sum + $line->getDurationMinutes(),
            0
        ));
        $endAt = $startAt->modify(sprintf('+%d minutes', $duration));
        $this->planningValidator->assertNoConflict($employee, $startAt, $endAt, $appointment->getId());
        $this->planningValidator->assertWithinAvailability($employee, $startAt, $endAt);

        $oldStatus = $appointment->getStatus();
        $appointment
            ->setEmployee($employee)
            ->setStartAt($startAt)
            ->setEndAt($endAt)
            ->touch();

        $this->writeHistory($appointment, $oldStatus, $appointment->getStatus(), 'customer', 'Replanification depuis espace client.');
        $this->em->flush();
        return $appointment;
    }

    public function cancelCustomerAppointment(Appointment $appointment, Customer $customer, ?string $reason = null): Appointment
    {
        $this->assertAppointmentOwnership($appointment, $customer);
        if ($appointment->getStatus() !== Appointment::STATUS_SCHEDULED) {
            throw new BadRequestHttpException('Ce rendez-vous ne peut plus etre annule.');
        }
        if ($appointment->getStartAt() <= (new \DateTimeImmutable())->modify(sprintf('+%d hours', self::CANCELLATION_MIN_HOURS))) {
            throw new BadRequestHttpException('Annulation non autorisee a moins de 24 heures du rendez-vous.');
        }

        $from = $appointment->getStatus();
        $appointment->setStatus(Appointment::STATUS_CANCELLED)->touch();
        $this->writeHistory($appointment, $from, Appointment::STATUS_CANCELLED, 'customer', $reason ?: 'Annulation client.');
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
            throw new BadRequestHttpException('Un rendez-vous en ligne doit etre reserve au moins 30 minutes a l avance.');
        }
    }

    private function sanitizePaymentMode(string $paymentMode): string
    {
        if (!in_array($paymentMode, [Appointment::PAYMENT_MODE_IN_STORE, Appointment::PAYMENT_MODE_ONLINE], true)) {
            throw new BadRequestHttpException('paymentMode invalide.');
        }

        return $paymentMode;
    }

    private function assertAppointmentOwnership(Appointment $appointment, Customer $customer): void
    {
        if (!$appointment->getCustomer() || $appointment->getCustomer()->getId() !== $customer->getId()) {
            throw new NotFoundHttpException('Rendez-vous introuvable.');
        }
    }
}

