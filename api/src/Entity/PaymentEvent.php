<?php

namespace App\Entity;

use App\Repository\PaymentEventRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PaymentEventRepository::class)]
#[ORM\Table(name: 'payment_events')]
class PaymentEvent
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Order $order = null;

    #[ORM\Column(length: 120, nullable: true, unique: true)]
    private ?string $providerEventId = null;

    #[ORM\Column(length: 80)]
    private string $provider = 'stripe';

    #[ORM\Column(length: 120)]
    private string $eventType;

    #[ORM\Column]
    private bool $signatureValid = false;

    #[ORM\Column(type: 'json')]
    private array $payload = [];

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getOrder(): ?Order { return $this->order; }
    public function setOrder(?Order $order): self { $this->order = $order; return $this; }
    public function getProviderEventId(): ?string { return $this->providerEventId; }
    public function setProviderEventId(?string $providerEventId): self { $this->providerEventId = $providerEventId; return $this; }
    public function getProvider(): string { return $this->provider; }
    public function setProvider(string $provider): self { $this->provider = $provider; return $this; }
    public function getEventType(): string { return $this->eventType; }
    public function setEventType(string $eventType): self { $this->eventType = $eventType; return $this; }
    public function isSignatureValid(): bool { return $this->signatureValid; }
    public function setSignatureValid(bool $signatureValid): self { $this->signatureValid = $signatureValid; return $this; }
    public function getPayload(): array { return $this->payload; }
    public function setPayload(array $payload): self { $this->payload = $payload; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}

