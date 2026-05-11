<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'product_reviews')]
class ProductReview
{
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

    #[ORM\Column]
    private int $rating = 5;

    #[ORM\Column(type: 'text')]
    private string $comment;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getProduct(): Product { return $this->product; }
    public function setProduct(Product $product): self { $this->product = $product; return $this; }
    public function getCustomer(): Customer { return $this->customer; }
    public function setCustomer(Customer $customer): self { $this->customer = $customer; return $this; }
    public function getRating(): int { return $this->rating; }
    public function setRating(int $rating): self { $this->rating = max(1, min(5, $rating)); return $this; }
    public function getComment(): string { return $this->comment; }
    public function setComment(string $comment): self { $this->comment = trim($comment); return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
