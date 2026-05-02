<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'loyalty_events')]
#[ORM\Index(columns: ['customer_id', 'created_at'], name: 'idx_loyalty_events_customer_created')]
class LoyaltyEvent
{
    public const TYPE_EARN = 'earn';
    public const TYPE_REDEEM = 'redeem';
    public const TYPE_ADJUST = 'adjust';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Customer $customer;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private LoyaltyAccount $account;

    #[ORM\Column(length: 20)]
    private string $eventType;

    #[ORM\Column]
    private int $pointsDelta;

    #[ORM\Column]
    private int $balanceAfter;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $reason = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $expiresAt = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getCustomer(): Customer { return $this->customer; }
    public function setCustomer(Customer $customer): self { $this->customer = $customer; return $this; }
    public function getAccount(): LoyaltyAccount { return $this->account; }
    public function setAccount(LoyaltyAccount $account): self { $this->account = $account; return $this; }
    public function getEventType(): string { return $this->eventType; }
    public function setEventType(string $eventType): self { $this->eventType = $eventType; return $this; }
    public function getPointsDelta(): int { return $this->pointsDelta; }
    public function setPointsDelta(int $pointsDelta): self { $this->pointsDelta = $pointsDelta; return $this; }
    public function getBalanceAfter(): int { return $this->balanceAfter; }
    public function setBalanceAfter(int $balanceAfter): self { $this->balanceAfter = $balanceAfter; return $this; }
    public function getReason(): ?string { return $this->reason; }
    public function setReason(?string $reason): self { $this->reason = $reason; return $this; }
    public function getExpiresAt(): ?\DateTimeImmutable { return $this->expiresAt; }
    public function setExpiresAt(?\DateTimeImmutable $expiresAt): self { $this->expiresAt = $expiresAt; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}

