<?php

namespace App\Tests\Service;

use App\Entity\Brand;
use App\Entity\Category;
use App\Entity\Product;
use App\Service\StockManager;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class StockManagerTest extends TestCase
{
    public function testIncrementMovementIncreasesStock(): void
    {
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('persist');

        $manager = new StockManager($em);
        $product = $this->buildProduct(10);

        $manager->applyMovement($product, 'in', 5, 'restock');

        self::assertSame(15, $product->getStock());
    }

    public function testDecrementBlocksNegativeStock(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $em = $this->createMock(EntityManagerInterface::class);
        $manager = new StockManager($em);
        $product = $this->buildProduct(2);

        $manager->applyMovement($product, 'out', 5, 'sale');
    }

    private function buildProduct(int $stock): Product
    {
        $brand = (new Brand())->setName('B')->setIsActive(true);
        $category = (new Category())->setName('C')->setIsActive(true);

        return (new Product())
            ->setName('P')
            ->setSku('SKU-1')
            ->setBrand($brand)
            ->setCategory($category)
            ->setPrice('10.00')
            ->setStock($stock)
            ->setIsActive(true);
    }
}
