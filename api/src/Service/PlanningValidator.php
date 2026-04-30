<?php

namespace App\Service;

use App\Entity\Employee;
use App\Repository\AppointmentRepository;
use App\Repository\EmployeeAvailabilityRepository;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class PlanningValidator
{
    public function __construct(
        private readonly AppointmentRepository $appointmentRepository,
        private readonly EmployeeAvailabilityRepository $availabilityRepository,
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

    public function assertWithinAvailability(Employee $employee, \DateTimeImmutable $startAt, \DateTimeImmutable $endAt): void
    {
        $dayOfWeek = (int) $startAt->format('N');
        $windows = $this->availabilityRepository->findForEmployeeAndDay($employee, $dayOfWeek);
        if ($windows === []) {
            throw new BadRequestHttpException('Aucune disponibilite definie pour ce jour.');
        }

        $slotStart = $startAt->format('H:i:s');
        $slotEnd = $endAt->format('H:i:s');
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
}

