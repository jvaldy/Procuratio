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
    public function __construct(
        private readonly AppointmentRepository $appointmentRepository,
        private readonly EmployeeAvailabilityRepository $availabilityRepository,
        private readonly BusinessHourRepository $businessHourRepository,
    ) {
    }

    public function assertNoConflict(Employee $employee, \DateTimeImmutable $startAt, \DateTimeImmutable $endAt, ?int $excludeAppointmentId = null): void
    {
        if ($endAt <= $startAt) {
            throw new BadRequestHttpException('La fin doit etre strictement apres le debut.');
        }

        if ($this->appointmentRepository->hasConflict($employee, $startAt, $endAt, $excludeAppointmentId)) {
            throw new BadRequestHttpException('Conflit de planning: ce collaborateur a deja un rendez-vous sur ce creneau.');
        }
    }

    public function assertCustomerAvailability(?Customer $customer, \DateTimeImmutable $startAt, \DateTimeImmutable $endAt, ?int $excludeAppointmentId = null): void
    {
        if (!$customer) {
            return;
        }

        if ($this->appointmentRepository->hasCustomerConflict($customer, $startAt, $endAt, $excludeAppointmentId)) {
            throw new BadRequestHttpException('Conflit de planning: ce client a deja un rendez-vous sur ce creneau.');
        }
    }

    public function assertWithinAvailability(Employee $employee, \DateTimeImmutable $startAt, \DateTimeImmutable $endAt): void
    {
        $dayOfWeek = (int) $startAt->format('N');
        $businessHour = $this->businessHourRepository->findForDay($dayOfWeek);
        if (!$businessHour || !$businessHour->isOpen()) {
            throw new BadRequestHttpException('Le salon est ferme sur ce jour.');
        }

        $slotStart = $startAt->format('H:i:s');
        $slotEnd = $endAt->format('H:i:s');
        $businessStart = $businessHour->getStartTime()->format('H:i:s');
        $businessEnd = $businessHour->getEndTime()->format('H:i:s');
        if ($slotStart < $businessStart || $slotEnd > $businessEnd) {
            throw new BadRequestHttpException('Le creneau sort des horaires generaux du salon.');
        }

        $windows = $this->availabilityRepository->findForEmployeeAndDay($employee, $dayOfWeek);
        if ($windows === []) {
            throw new BadRequestHttpException('Aucune disponibilite definie pour ce jour.');
        }

        foreach ($windows as $window) {
            if ($window->isAvailable()) {
                continue;
            }

            $windowStart = $window->getStartTime()->format('H:i:s');
            $windowEnd = $window->getEndTime()->format('H:i:s');
            if ($slotStart < $windowEnd && $slotEnd > $windowStart) {
                throw new BadRequestHttpException('Ce collaborateur est indisponible sur ce creneau.');
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

        throw new BadRequestHttpException('Le creneau sort des disponibilites employe.');
    }

    public function assertAvailabilityWindowWithinBusinessHours(int $dayOfWeek, \DateTimeImmutable $startTime, \DateTimeImmutable $endTime): void
    {
        $businessHour = $this->businessHourRepository->findForDay($dayOfWeek);
        if (!$businessHour || !$businessHour->isOpen()) {
            throw new BadRequestHttpException('Impossible de definir des horaires employe sur un jour ou le salon est ferme.');
        }

        $windowStart = $startTime->format('H:i:s');
        $windowEnd = $endTime->format('H:i:s');
        $businessStart = $businessHour->getStartTime()->format('H:i:s');
        $businessEnd = $businessHour->getEndTime()->format('H:i:s');

        if ($windowStart < $businessStart || $windowEnd > $businessEnd) {
            throw new BadRequestHttpException('Les horaires employe doivent rester dans les horaires d ouverture du salon.');
        }
    }
}
