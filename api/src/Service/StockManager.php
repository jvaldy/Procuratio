<?php

namespace App\Service;

use App\Entity\Product;
use App\Entity\StockMovement;
use Doctrine\ORM\EntityManagerInterface;

class StockManager
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    // We keep stock rules server-side to avoid drift between UI behavior and API truth.
    public function applyMovement(Product $product, string $type, int $quantity, string $reason, ?string $comment = null, bool $blockNegative = true): Product
    {
        $old = $product->getStock();
        $newStock = $old;

        if ($type === 'in') {
            $newStock = $old + $quantity;
        } elseif ($type === 'out') {
            $newStock = $old - $quantity;
        } elseif ($type === 'adjust') {
            $newStock = $quantity;
        }

        if ($blockNegative && $newStock < 0) {
            throw new \InvalidArgumentException('Negative stock is not allowed by configuration.');
        }

        $product->setStock($newStock);
        $product->touch();

        $movement = (new StockMovement())
            ->setProduct($product)
            ->setMovementType($type)
            ->setQuantity($quantity)
            ->setPreviousStock($old)
            ->setNewStock($newStock)
            ->setReason($reason)
            ->setComment($comment);

        $this->em->persist($movement);

        return $product;
    }
}
