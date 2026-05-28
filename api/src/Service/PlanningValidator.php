<?php

namespace App\Service;

use App\Entity\Customer;
use App\Entity\Employee;
use App\Repository\AppointmentRepository;
use App\Repository\BusinessHourRepository;
use App\Repository\EmployeeAvailabilityRepository;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class PlanningValidator
{
    private const MSG_EMPLOYEE_CONFLICT = 'Scheduling conflict: this employee already has an appointment during that time slot.';
    private const MSG_EMPLOYEE_UNAVAILABLE = 'This employee is unavailable during that time slot.';
    private const MSG_EMPLOYEE_WINDOW_OUTSIDE_BUSINESS = 'Employee availability must stay within the salon opening hours.';
    private const MSG_INVALID_TIME_RANGE = 'The end time must be strictly after the start time.';
    private const MSG_NO_EMPLOYEE_AVAILABILITY = 'No employee availability is defined for this day.';
    private const MSG_SALON_CLOSED = 'The salon is closed on this day.';
    private const MSG_SLOT_OUTSIDE_BUSINESS = 'The selected time slot is outside the salon opening hours.';
    private const MSG_SLOT_OUTSIDE_EMPLOYEE_AVAILABILITY = 'The selected time slot is outside the employee availability.';
    private const MSG_STORE_CLOSED_FOR_EMPLOYEE_WINDOW = 'Employee availability cannot be defined on a day when the salon is closed.';
    private const MSG_CUSTOMER_CONFLICT = 'Scheduling conflict: this customer already has an appointment during that time slot.';

    public function __construct(
        private readonly AppointmentRepository $appointmentRepository,
        private readonly EmployeeAvailabilityRepository $availabilityRepository,
        private readonly BusinessHourRepository $businessHourRepository,
    ) {
    }

    public function assertNoConflict(Employee $employee, \DateTimeImmutable $startAt, \DateTimeImmutable $endAt, ?int $excludeAppointmentId = null): void
    {
        if ($endAt <= $startAt) {
            throw new BadRequestHttpException(self::MSG_INVALID_TIME_RANGE);
        }

        if ($this->appointmentRepository->hasConflict($employee, $startAt, $endAt, $excludeAppointmentId)) {
            throw new BadRequestHttpException(self::MSG_EMPLOYEE_CONFLICT);
        }
    }

    public function assertCustomerAvailability(?Customer $customer, \DateTimeImmutable $startAt, \DateTimeImmutable $endAt, ?int $excludeAppointmentId = null): void
    {
        if (!$customer) {
            return;
        }

        if ($this->appointmentRepository->hasCustomerConflict($customer, $startAt, $endAt, $excludeAppointmentId)) {
            throw new BadRequestHttpException(self::MSG_CUSTOMER_CONFLICT);
        }
    }

    public function assertWithinAvailability(Employee $employee, \DateTimeImmutable $startAt, \DateTimeImmutable $endAt): void
    {
        $dayOfWeek = (int) $startAt->format('N');
        $businessHour = $this->businessHourRepository->findForDay($dayOfWeek, $employee->getStore());
        if (!$businessHour || !$businessHour->isOpen()) {
            throw new BadRequestHttpException(self::MSG_SALON_CLOSED);
        }

        $slotStart = $startAt->format('H:i:s');
        $slotEnd = $endAt->format('H:i:s');
        $businessStart = $businessHour->getStartTime()->format('H:i:s');
        $businessEnd = $businessHour->getEndTime()->format('H:i:s');
        if ($slotStart < $businessStart || $slotEnd > $businessEnd) {
            throw new BadRequestHttpException(self::MSG_SLOT_OUTSIDE_BUSINESS);
        }

        $windows = $this->availabilityRepository->findForEmployeeAndDay($employee, $dayOfWeek);
        if ($windows === []) {
            throw new BadRequestHttpException(self::MSG_NO_EMPLOYEE_AVAILABILITY);
        }

        foreach ($windows as $window) {
            if ($window->isAvailable()) {
                continue;
            }

            $windowStart = $window->getStartTime()->format('H:i:s');
            $windowEnd = $window->getEndTime()->format('H:i:s');
            if ($slotStart < $windowEnd && $slotEnd > $windowStart) {
                throw new BadRequestHttpException(self::MSG_EMPLOYEE_UNAVAILABLE);
            }
        }

        foreach ($windows as $window) {
            if (!$window->isAvailable()) {
                continue;
            }
            $windowStart = $window->getStartTime()->format('H:i:s');
            $windowEnd = $window->getEndTime()->format('H:i:s');
            if ($slotStart >= $windowStart && $slotEnd <= $windowEnd) {
                return;
            }
        }

        throw new BadRequestHttpException(self::MSG_SLOT_OUTSIDE_EMPLOYEE_AVAILABILITY);
    }

    public function assertAvailabilityWindowWithinBusinessHours(int $dayOfWeek, \DateTimeImmutable $startTime, \DateTimeImmutable $endTime): void
    {
        $businessHour = $this->businessHourRepository->findForDay($dayOfWeek);
        if (!$businessHour || !$businessHour->isOpen()) {
            throw new BadRequestHttpException(self::MSG_STORE_CLOSED_FOR_EMPLOYEE_WINDOW);
        }

        $windowStart = $startTime->format('H:i:s');
        $windowEnd = $endTime->format('H:i:s');
        $businessStart = $businessHour->getStartTime()->format('H:i:s');
        $businessEnd = $businessHour->getEndTime()->format('H:i:s');

        if ($windowStart < $businessStart || $windowEnd > $businessEnd) {
            throw new BadRequestHttpException(self::MSG_EMPLOYEE_WINDOW_OUTSIDE_BUSINESS);
        }
    }
}
