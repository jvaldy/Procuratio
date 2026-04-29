<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'stock_movements')]
class StockMovement
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Product $product;

    #[ORM\Column(length: 16)]
    private string $movementType;

    #[ORM\Column]
    private int $quantity;

    #[ORM\Column]
    private int $previousStock;

    #[ORM\Column]
    private int $newStock;

    #[ORM\Column(length: 120)]
    private string $reason;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $comment = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function setProduct(Product $product): self { $this->product = $product; return $this; }
    public function setMovementType(string $movementType): self { $this->movementType = $movementType; return $this; }
    public function setQuantity(int $quantity): self { $this->quantity = $quantity; return $this; }
    public function setPreviousStock(int $previousStock): self { $this->previousStock = $previousStock; return $this; }
    public function setNewStock(int $newStock): self { $this->newStock = $newStock; return $this; }
    public function setReason(string $reason): self { $this->reason = $reason; return $this; }
    public function setComment(?string $comment): self { $this->comment = $comment; return $this; }
}
