<?php

namespace App\Entity;

use App\Repository\BookingSessionRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: BookingSessionRepository::class)]
#[ORM\Table(name: 'booking_sessions')]
#[ORM\Index(columns: ['customer_id', 'status', 'start_at'], name: 'idx_booking_sessions_customer_status_start')]
class BookingSession
{
    public const STATUS_OPEN = 'open';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_EXPIRED = 'expired';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 50, unique: true)]
    private string $sessionToken;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Customer $customer;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Employee $employee;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Service $service;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Appointment $appointment = null;

    #[ORM\Column(length: 20)]
    private string $status = self::STATUS_OPEN;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $startAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $endAt;

    #[ORM\Column(length: 20)]
    private string $paymentMode = Appointment::PAYMENT_MODE_IN_STORE;

    #[ORM\Column(length: 20)]
    private string $paymentStatus = Appointment::PAYMENT_STATUS_PENDING;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $expiresAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getSessionToken(): string { return $this->sessionToken; }
    public function setSessionToken(string $sessionToken): self { $this->sessionToken = $sessionToken; return $this; }
    public function getCustomer(): Customer { return $this->customer; }
    public function setCustomer(Customer $customer): self { $this->customer = $customer; return $this; }
    public function getEmployee(): Employee { return $this->employee; }
    public function setEmployee(Employee $employee): self { $this->employee = $employee; return $this; }
    public function getService(): Service { return $this->service; }
    public function setService(Service $service): self { $this->service = $service; return $this; }
    public function getAppointment(): ?Appointment { return $this->appointment; }
    public function setAppointment(?Appointment $appointment): self { $this->appointment = $appointment; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }
    public function getStartAt(): \DateTimeImmutable { return $this->startAt; }
    public function setStartAt(\DateTimeImmutable $startAt): self { $this->startAt = $startAt; return $this; }
    public function getEndAt(): \DateTimeImmutable { return $this->endAt; }
    public function setEndAt(\DateTimeImmutable $endAt): self { $this->endAt = $endAt; return $this; }
    public function getPaymentMode(): string { return $this->paymentMode; }
    public function setPaymentMode(string $paymentMode): self { $this->paymentMode = $paymentMode; return $this; }
    public function getPaymentStatus(): string { return $this->paymentStatus; }
    public function setPaymentStatus(string $paymentStatus): self { $this->paymentStatus = $paymentStatus; return $this; }
    public function getExpiresAt(): \DateTimeImmutable { return $this->expiresAt; }
    public function setExpiresAt(\DateTimeImmutable $expiresAt): self { $this->expiresAt = $expiresAt; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}

