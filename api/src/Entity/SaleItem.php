<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'sale_items')]
#[ORM\Index(columns: ['item_type', 'item_id'], name: 'idx_sale_items_item')]
class SaleItem
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'items')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Sale $sale;

    #[ORM\Column(length: 20)]
    private string $itemType;

    #[ORM\Column]
    private int $itemId;

    #[ORM\Column(length: 160)]
    private string $label;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $unitPrice;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $quantity;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $discountAmount = '0.00';

    #[ORM\Column(type: 'decimal', precision: 5, scale: 2)]
    private string $taxRate = '0.00';

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $lineTotal = '0.00';

    public function getId(): ?int { return $this->id; }
    public function getSale(): Sale { return $this->sale; }
    public function setSale(Sale $sale): self { $this->sale = $sale; return $this; }
    public function getItemType(): string { return $this->itemType; }
    public function setItemType(string $itemType): self { $this->itemType = $itemType; return $this; }
    public function getItemId(): int { return $this->itemId; }
    public function setItemId(int $itemId): self { $this->itemId = $itemId; return $this; }
    public function getLabel(): string { return $this->label; }
    public function setLabel(string $label): self { $this->label = $label; return $this; }
    public function getUnitPrice(): string { return $this->unitPrice; }
    public function setUnitPrice(string $unitPrice): self { $this->unitPrice = $unitPrice; return $this; }
    public function getQuantity(): string { return $this->quantity; }
    public function setQuantity(string $quantity): self { $this->quantity = $quantity; return $this; }
    public function getDiscountAmount(): string { return $this->discountAmount; }
    public function setDiscountAmount(string $discountAmount): self { $this->discountAmount = $discountAmount; return $this; }
    public function getTaxRate(): string { return $this->taxRate; }
    public function setTaxRate(string $taxRate): self { $this->taxRate = $taxRate; return $this; }
    public function getLineTotal(): string { return $this->lineTotal; }
    public function setLineTotal(string $lineTotal): self { $this->lineTotal = $lineTotal; return $this; }
}

