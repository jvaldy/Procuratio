<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'loyalty_accounts')]
#[ORM\Index(columns: ['customer_id', 'updated_at'], name: 'idx_loyalty_accounts_customer_updated')]
class LoyaltyAccount
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Customer $customer;

    #[ORM\Column]
    private int $pointsBalance = 0;

    #[ORM\Column]
    private bool $isActive = true;

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $subscriptionName = null;

    #[ORM\Column(length: 20)]
    private string $subscriptionStatus = 'inactive';

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $subscriptionStartedAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $subscriptionEndsAt = null;

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $visitCardName = null;

    #[ORM\Column(nullable: true)]
    private ?int $visitCardTarget = null;

    #[ORM\Column]
    private int $visitCardUsed = 0;

    #[ORM\Column]
    private bool $visitCardActive = false;

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
    public function getCustomer(): Customer { return $this->customer; }
    public function setCustomer(Customer $customer): self { $this->customer = $customer; return $this; }
    public function getPointsBalance(): int { return $this->pointsBalance; }
    public function setPointsBalance(int $pointsBalance): self { $this->pointsBalance = $pointsBalance; return $this; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $isActive): self { $this->isActive = $isActive; return $this; }
    public function getSubscriptionName(): ?string { return $this->subscriptionName; }
    public function setSubscriptionName(?string $subscriptionName): self { $this->subscriptionName = $subscriptionName; return $this; }
    public function getSubscriptionStatus(): string { return $this->subscriptionStatus; }
    public function setSubscriptionStatus(string $subscriptionStatus): self { $this->subscriptionStatus = $subscriptionStatus; return $this; }
    public function getSubscriptionStartedAt(): ?\DateTimeImmutable { return $this->subscriptionStartedAt; }
    public function setSubscriptionStartedAt(?\DateTimeImmutable $subscriptionStartedAt): self { $this->subscriptionStartedAt = $subscriptionStartedAt; return $this; }
    public function getSubscriptionEndsAt(): ?\DateTimeImmutable { return $this->subscriptionEndsAt; }
    public function setSubscriptionEndsAt(?\DateTimeImmutable $subscriptionEndsAt): self { $this->subscriptionEndsAt = $subscriptionEndsAt; return $this; }
    public function getVisitCardName(): ?string { return $this->visitCardName; }
    public function setVisitCardName(?string $visitCardName): self { $this->visitCardName = $visitCardName; return $this; }
    public function getVisitCardTarget(): ?int { return $this->visitCardTarget; }
    public function setVisitCardTarget(?int $visitCardTarget): self { $this->visitCardTarget = $visitCardTarget; return $this; }
    public function getVisitCardUsed(): int { return $this->visitCardUsed; }
    public function setVisitCardUsed(int $visitCardUsed): self { $this->visitCardUsed = $visitCardUsed; return $this; }
    public function isVisitCardActive(): bool { return $this->visitCardActive; }
    public function setVisitCardActive(bool $visitCardActive): self { $this->visitCardActive = $visitCardActive; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
