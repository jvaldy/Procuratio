<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'payments')]
#[ORM\Index(columns: ['paid_at'], name: 'idx_payments_paid_at')]
class Payment
{
    public const METHOD_CASH = 'cash';
    public const METHOD_CARD = 'card';
    public const STATUS_ACCEPTED = 'accepted';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'payments')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Sale $sale;

    #[ORM\Column(length: 20)]
    private string $method;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $amount;

    #[ORM\Column(length: 20)]
    private string $status = self::STATUS_ACCEPTED;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $paidAt;

    #[ORM\Column(length: 80, nullable: true)]
    private ?string $externalRef = null;

    public function __construct()
    {
        $this->paidAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getSale(): Sale { return $this->sale; }
    public function setSale(Sale $sale): self { $this->sale = $sale; return $this; }
    public function getMethod(): string { return $this->method; }
    public function setMethod(string $method): self { $this->method = $method; return $this; }
    public function getAmount(): string { return $this->amount; }
    public function setAmount(string $amount): self { $this->amount = $amount; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }
    public function getPaidAt(): \DateTimeImmutable { return $this->paidAt; }
    public function getExternalRef(): ?string { return $this->externalRef; }
    public function setExternalRef(?string $externalRef): self { $this->externalRef = $externalRef; return $this; }
}
