<?php

namespace App\Entity;

use App\Repository\AppointmentRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AppointmentRepository::class)]
#[ORM\Table(name: 'appointments')]
#[ORM\Index(columns: ['employee_id', 'start_at', 'end_at'], name: 'idx_appointments_employee_slot')]
#[ORM\Index(columns: ['status'], name: 'idx_appointments_status')]
class Appointment
{
    public const STATUS_SCHEDULED = 'scheduled';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';
    public const SOURCE_INTERNAL = 'internal';
    public const SOURCE_WEB = 'web';
    public const PAYMENT_MODE_ONLINE = 'online';
    public const PAYMENT_MODE_IN_STORE = 'in_store';
    public const PAYMENT_STATUS_PENDING = 'pending';
    public const PAYMENT_STATUS_PAID = 'paid';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Employee $employee;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Customer $customer = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Store $store = null;

    #[ORM\Column(length: 20)]
    private string $status = self::STATUS_SCHEDULED;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $startAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $endAt;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(length: 20)]
    private string $bookingSource = self::SOURCE_INTERNAL;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $paymentMode = null;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $paymentStatus = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    /** @var Collection<int, AppointmentService> */
    #[ORM\OneToMany(mappedBy: 'appointment', targetEntity: AppointmentService::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $services;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
        $this->services = new ArrayCollection();
    }

    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getEmployee(): Employee { return $this->employee; }
    public function setEmployee(Employee $employee): self { $this->employee = $employee; return $this; }
    public function getCustomer(): ?Customer { return $this->customer; }
    public function setCustomer(?Customer $customer): self { $this->customer = $customer; return $this; }
    public function getStore(): ?Store { return $this->store; }
    public function setStore(?Store $store): self { $this->store = $store; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }
    public function getStartAt(): \DateTimeImmutable { return $this->startAt; }
    public function setStartAt(\DateTimeImmutable $startAt): self { $this->startAt = $startAt; return $this; }
    public function getEndAt(): \DateTimeImmutable { return $this->endAt; }
    public function setEndAt(\DateTimeImmutable $endAt): self { $this->endAt = $endAt; return $this; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $notes): self { $this->notes = $notes; return $this; }
    public function getBookingSource(): string { return $this->bookingSource; }
    public function setBookingSource(string $bookingSource): self { $this->bookingSource = $bookingSource; return $this; }
    public function getPaymentMode(): ?string { return $this->paymentMode; }
    public function setPaymentMode(?string $paymentMode): self { $this->paymentMode = $paymentMode; return $this; }
    public function getPaymentStatus(): ?string { return $this->paymentStatus; }
    public function setPaymentStatus(?string $paymentStatus): self { $this->paymentStatus = $paymentStatus; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }

    /** @return Collection<int, AppointmentService> */
    public function getServices(): Collection
    {
        return $this->services;
    }

    public function addService(AppointmentService $service): self
    {
        if (!$this->services->contains($service)) {
            $this->services->add($service);
            $service->setAppointment($this);
        }

        return $this;
    }

    public function clearServices(): void
    {
        $this->services->clear();
    }
}
