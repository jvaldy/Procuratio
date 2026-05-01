<?php

namespace App\Entity;

use App\Repository\AppointmentStatusHistoryRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AppointmentStatusHistoryRepository::class)]
#[ORM\Table(name: 'appointment_status_history')]
#[ORM\Index(columns: ['appointment_id', 'created_at'], name: 'idx_appointment_history_appointment')]
#[ORM\Index(columns: ['customer_id', 'created_at'], name: 'idx_appointment_history_customer')]
class AppointmentStatusHistory
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Appointment $appointment;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Customer $customer = null;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $fromStatus = null;

    #[ORM\Column(length: 20)]
    private string $toStatus;

    #[ORM\Column(length: 20)]
    private string $changedBy = 'system';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $reason = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getAppointment(): Appointment { return $this->appointment; }
    public function setAppointment(Appointment $appointment): self { $this->appointment = $appointment; return $this; }
    public function getCustomer(): ?Customer { return $this->customer; }
    public function setCustomer(?Customer $customer): self { $this->customer = $customer; return $this; }
    public function getFromStatus(): ?string { return $this->fromStatus; }
    public function setFromStatus(?string $fromStatus): self { $this->fromStatus = $fromStatus; return $this; }
    public function getToStatus(): string { return $this->toStatus; }
    public function setToStatus(string $toStatus): self { $this->toStatus = $toStatus; return $this; }
    public function getChangedBy(): string { return $this->changedBy; }
    public function setChangedBy(string $changedBy): self { $this->changedBy = $changedBy; return $this; }
    public function getReason(): ?string { return $this->reason; }
    public function setReason(?string $reason): self { $this->reason = $reason; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}

