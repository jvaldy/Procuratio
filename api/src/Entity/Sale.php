<?php

namespace App\Entity;

use App\Repository\SaleRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SaleRepository::class)]
#[ORM\Table(name: 'sales')]
#[ORM\Index(columns: ['created_at'], name: 'idx_sales_created_at')]
#[ORM\Index(columns: ['status'], name: 'idx_sales_status')]
#[ORM\Index(columns: ['payment_status'], name: 'idx_sales_payment_status')]
class Sale
{
    public const STATUS_OPEN = 'open';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_COMPLETED = 'completed';

    public const PAYMENT_PENDING = 'pending';
    public const PAYMENT_PAID = 'paid';
    public const PAYMENT_PARTIAL = 'partial';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Customer $customer = null;

    #[ORM\Column(length: 20)]
    private string $status = self::STATUS_OPEN;

    #[ORM\Column(length: 20)]
    private string $paymentStatus = self::PAYMENT_PENDING;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $subTotal = '0.00';

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $discountTotal = '0.00';

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $taxTotal = '0.00';

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $total = '0.00';

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    /** @var Collection<int, SaleItem> */
    #[ORM\OneToMany(mappedBy: 'sale', targetEntity: SaleItem::class, cascade: ['persist'], orphanRemoval: true)]
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

    public function getId(): ?int { return $this->id; }
    public function getCustomer(): ?Customer { return $this->customer; }
    public function setCustomer(?Customer $customer): self { $this->customer = $customer; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }
    public function getPaymentStatus(): string { return $this->paymentStatus; }
    public function setPaymentStatus(string $paymentStatus): self { $this->paymentStatus = $paymentStatus; return $this; }
    public function getSubTotal(): string { return $this->subTotal; }
    public function setSubTotal(string $subTotal): self { $this->subTotal = $subTotal; return $this; }
    public function getDiscountTotal(): string { return $this->discountTotal; }
    public function setDiscountTotal(string $discountTotal): self { $this->discountTotal = $discountTotal; return $this; }
    public function getTaxTotal(): string { return $this->taxTotal; }
    public function setTaxTotal(string $taxTotal): self { $this->taxTotal = $taxTotal; return $this; }
    public function getTotal(): string { return $this->total; }
    public function setTotal(string $total): self { $this->total = $total; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }

    /** @return Collection<int, SaleItem> */
    public function getItems(): Collection
    {
        return $this->items;
    }

    public function addItem(SaleItem $item): self
    {
        if (!$this->items->contains($item)) {
            $this->items->add($item);
            $item->setSale($this);
        }

        return $this;
    }
}

