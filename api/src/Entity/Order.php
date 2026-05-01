<?php

namespace App\Entity;

use App\Repository\OrderRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: OrderRepository::class)]
#[ORM\Table(name: 'orders')]
class Order
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID = 'paid';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_READY_FOR_PICKUP = 'ready_for_pickup';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 40, unique: true)]
    private string $orderNumber;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Customer $customer;

    #[ORM\Column(length: 32)]
    private string $status = self::STATUS_PENDING;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $subTotal = '0.00';

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $taxTotal = '0.00';

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $total = '0.00';

    #[ORM\Column(length: 3)]
    private string $currency = 'eur';

    #[ORM\Column(length: 120, nullable: true, unique: true)]
    private ?string $stripePaymentIntentId = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $stripeClientSecret = null;

    #[ORM\Column]
    private bool $pickupInStore = false;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $pickupSlot = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $pickupNote = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    /** @var Collection<int, OrderItem> */
    #[ORM\OneToMany(mappedBy: 'order', targetEntity: OrderItem::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $items;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
        $this->items = new ArrayCollection();
    }

    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function addItem(OrderItem $item): self
    {
        if (!$this->items->contains($item)) {
            $this->items->add($item);
            $item->setOrder($this);
        }

        return $this;
    }

    public function getId(): ?int { return $this->id; }
    public function getOrderNumber(): string { return $this->orderNumber; }
    public function setOrderNumber(string $orderNumber): self { $this->orderNumber = $orderNumber; return $this; }
    public function getCustomer(): Customer { return $this->customer; }
    public function setCustomer(Customer $customer): self { $this->customer = $customer; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }
    public function getSubTotal(): string { return $this->subTotal; }
    public function setSubTotal(string $subTotal): self { $this->subTotal = $subTotal; return $this; }
    public function getTaxTotal(): string { return $this->taxTotal; }
    public function setTaxTotal(string $taxTotal): self { $this->taxTotal = $taxTotal; return $this; }
    public function getTotal(): string { return $this->total; }
    public function setTotal(string $total): self { $this->total = $total; return $this; }
    public function getCurrency(): string { return $this->currency; }
    public function setCurrency(string $currency): self { $this->currency = strtolower($currency); return $this; }
    public function getStripePaymentIntentId(): ?string { return $this->stripePaymentIntentId; }
    public function setStripePaymentIntentId(?string $stripePaymentIntentId): self { $this->stripePaymentIntentId = $stripePaymentIntentId; return $this; }
    public function getStripeClientSecret(): ?string { return $this->stripeClientSecret; }
    public function setStripeClientSecret(?string $stripeClientSecret): self { $this->stripeClientSecret = $stripeClientSecret; return $this; }
    public function isPickupInStore(): bool { return $this->pickupInStore; }
    public function setPickupInStore(bool $pickupInStore): self { $this->pickupInStore = $pickupInStore; return $this; }
    public function getPickupSlot(): ?string { return $this->pickupSlot; }
    public function setPickupSlot(?string $pickupSlot): self { $this->pickupSlot = $pickupSlot; return $this; }
    public function getPickupNote(): ?string { return $this->pickupNote; }
    public function setPickupNote(?string $pickupNote): self { $this->pickupNote = $pickupNote; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
    /** @return Collection<int, OrderItem> */
    public function getItems(): Collection { return $this->items; }
}

