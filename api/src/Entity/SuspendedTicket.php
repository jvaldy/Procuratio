<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'suspended_tickets')]
class SuspendedTicket
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\OneToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE', unique: true)]
    private Sale $sale;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $reason = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $suspendedAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $resumedAt = null;

    public function __construct()
    {
        $this->suspendedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getSale(): Sale { return $this->sale; }
    public function setSale(Sale $sale): self { $this->sale = $sale; return $this; }
    public function getReason(): ?string { return $this->reason; }
    public function setReason(?string $reason): self { $this->reason = $reason; return $this; }
    public function getSuspendedAt(): \DateTimeImmutable { return $this->suspendedAt; }
    public function getResumedAt(): ?\DateTimeImmutable { return $this->resumedAt; }
    public function setResumedAt(?\DateTimeImmutable $resumedAt): self { $this->resumedAt = $resumedAt; return $this; }
}

