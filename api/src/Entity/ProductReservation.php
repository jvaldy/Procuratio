<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'product_reservations')]
#[ORM\Index(columns: ['product_id', 'status', 'expires_at'], name: 'idx_product_reservation_lookup')]
#[ORM\Index(columns: ['customer_id', 'status'], name: 'idx_product_reservation_customer')]
class ProductReservation
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_PICKED_UP = 'picked_up';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Product $product;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Customer $customer;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Store $store = null;

    #[ORM\Column]
    private int $quantity;

    #[ORM\Column(length: 20)]
    private string $status = self::STATUS_ACTIVE;

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
    public function getProduct(): Product { return $this->product; }
    public function setProduct(Product $product): self { $this->product = $product; return $this; }
    public function getCustomer(): Customer { return $this->customer; }
    public function setCustomer(Customer $customer): self { $this->customer = $customer; return $this; }
    public function getStore(): ?Store { return $this->store; }
    public function setStore(?Store $store): self { $this->store = $store; return $this; }
    public function getQuantity(): int { return $this->quantity; }
    public function setQuantity(int $quantity): self { $this->quantity = $quantity; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }
    public function getExpiresAt(): \DateTimeImmutable { return $this->expiresAt; }
    public function setExpiresAt(\DateTimeImmutable $expiresAt): self { $this->expiresAt = $expiresAt; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
