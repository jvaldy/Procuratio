<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'campaigns')]
#[ORM\Index(columns: ['status', 'created_at'], name: 'idx_campaigns_status_created')]
class Campaign
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_RUNNING = 'running';
    public const STATUS_COMPLETED = 'completed';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 120)]
    private string $name;

    #[ORM\Column(length: 20)]
    private string $channel;

    #[ORM\Column(length: 20)]
    private string $status = self::STATUS_DRAFT;

    #[ORM\Column(type: 'json')]
    private array $segment = [];

    #[ORM\Column(type: 'text')]
    private string $messageTemplate;

    #[ORM\Column]
    private int $targetCount = 0;

    #[ORM\Column]
    private int $sentCount = 0;

    #[ORM\Column]
    private int $failedCount = 0;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function touch(): void { $this->updatedAt = new \DateTimeImmutable(); }
    public function getId(): ?int { return $this->id; }
    public function getName(): string { return $this->name; }
    public function setName(string $name): self { $this->name = $name; return $this; }
    public function getChannel(): string { return $this->channel; }
    public function setChannel(string $channel): self { $this->channel = $channel; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }
    public function getSegment(): array { return $this->segment; }
    public function setSegment(array $segment): self { $this->segment = $segment; return $this; }
    public function getMessageTemplate(): string { return $this->messageTemplate; }
    public function setMessageTemplate(string $messageTemplate): self { $this->messageTemplate = $messageTemplate; return $this; }
    public function getTargetCount(): int { return $this->targetCount; }
    public function setTargetCount(int $targetCount): self { $this->targetCount = $targetCount; return $this; }
    public function getSentCount(): int { return $this->sentCount; }
    public function setSentCount(int $sentCount): self { $this->sentCount = $sentCount; return $this; }
    public function getFailedCount(): int { return $this->failedCount; }
    public function setFailedCount(int $failedCount): self { $this->failedCount = $failedCount; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}

