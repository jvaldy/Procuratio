<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'employee_availability')]
#[ORM\Index(columns: ['employee_id', 'day_of_week'], name: 'idx_availability_employee_day')]
class EmployeeAvailability
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Employee $employee;

    #[ORM\Column]
    private int $dayOfWeek;

    #[ORM\Column(type: 'time_immutable')]
    private \DateTimeImmutable $startTime;

    #[ORM\Column(type: 'time_immutable')]
    private \DateTimeImmutable $endTime;

    #[ORM\Column]
    private bool $isAvailable = true;

    public function getId(): ?int { return $this->id; }
    public function getEmployee(): Employee { return $this->employee; }
    public function setEmployee(Employee $employee): self { $this->employee = $employee; return $this; }
    public function getDayOfWeek(): int { return $this->dayOfWeek; }
    public function setDayOfWeek(int $dayOfWeek): self { $this->dayOfWeek = $dayOfWeek; return $this; }
    public function getStartTime(): \DateTimeImmutable { return $this->startTime; }
    public function setStartTime(\DateTimeImmutable $startTime): self { $this->startTime = $startTime; return $this; }
    public function getEndTime(): \DateTimeImmutable { return $this->endTime; }
    public function setEndTime(\DateTimeImmutable $endTime): self { $this->endTime = $endTime; return $this; }
    public function isAvailable(): bool { return $this->isAvailable; }
    public function setIsAvailable(bool $isAvailable): self { $this->isAvailable = $isAvailable; return $this; }
}

