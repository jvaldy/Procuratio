<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'appointment_services')]
class AppointmentService
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'services')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Appointment $appointment;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Service $service;

    #[ORM\Column]
    private int $quantity = 1;

    #[ORM\Column]
    private int $durationMinutes;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $unitPrice = '0.00';

    public function getId(): ?int { return $this->id; }
    public function getAppointment(): Appointment { return $this->appointment; }
    public function setAppointment(Appointment $appointment): self { $this->appointment = $appointment; return $this; }
    public function getService(): Service { return $this->service; }
    public function setService(Service $service): self { $this->service = $service; return $this; }
    public function getQuantity(): int { return $this->quantity; }
    public function setQuantity(int $quantity): self { $this->quantity = $quantity; return $this; }
    public function getDurationMinutes(): int { return $this->durationMinutes; }
    public function setDurationMinutes(int $durationMinutes): self { $this->durationMinutes = $durationMinutes; return $this; }
    public function getUnitPrice(): string { return $this->unitPrice; }
    public function setUnitPrice(string $unitPrice): self { $this->unitPrice = $unitPrice; return $this; }
}
