<?php

namespace App\Tests\Service;

use App\Entity\Employee;
use App\Repository\AppointmentRepository;
use App\Repository\BusinessHourRepository;
use App\Repository\EmployeeAvailabilityRepository;
use App\Service\PlanningValidator;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class PlanningValidatorTest extends TestCase
{
    public function testThrowsWhenConflictExists(): void
    {
        $appointmentRepo = $this->createMock(AppointmentRepository::class);
        $availabilityRepo = $this->createMock(EmployeeAvailabilityRepository::class);
        $businessHourRepo = $this->createMock(BusinessHourRepository::class);

        $appointmentRepo->method('hasConflict')->willReturn(true);
        $validator = new PlanningValidator($appointmentRepo, $availabilityRepo, $businessHourRepo);

        $this->expectException(BadRequestHttpException::class);
        $validator->assertNoConflict(new Employee(), new \DateTimeImmutable('2026-05-01 10:00'), new \DateTimeImmutable('2026-05-01 11:00'));
    }
}
