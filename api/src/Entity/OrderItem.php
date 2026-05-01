<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'order_items')]
class OrderItem
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'items')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Order $order;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Product $product;

    #[ORM\Column(length: 120)]
    private string $productName;

    #[ORM\Column(length: 40)]
    private string $productSku;

    #[ORM\Column]
    private int $quantity = 1;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $unitPrice;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $lineTotal;

    public function getId(): ?int { return $this->id; }
    public function getOrder(): Order { return $this->order; }
    public function setOrder(Order $order): self { $this->order = $order; return $this; }
    public function getProduct(): Product { return $this->product; }
    public function setProduct(Product $product): self { $this->product = $product; return $this; }
    public function getProductName(): string { return $this->productName; }
    public function setProductName(string $productName): self { $this->productName = $productName; return $this; }
    public function getProductSku(): string { return $this->productSku; }
    public function setProductSku(string $productSku): self { $this->productSku = $productSku; return $this; }
    public function getQuantity(): int { return $this->quantity; }
    public function setQuantity(int $quantity): self { $this->quantity = $quantity; return $this; }
    public function getUnitPrice(): string { return $this->unitPrice; }
    public function setUnitPrice(string $unitPrice): self { $this->unitPrice = $unitPrice; return $this; }
    public function getLineTotal(): string { return $this->lineTotal; }
    public function setLineTotal(string $lineTotal): self { $this->lineTotal = $lineTotal; return $this; }
}

