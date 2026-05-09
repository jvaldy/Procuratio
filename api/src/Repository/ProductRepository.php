<?php

namespace App\Repository;

use App\Entity\Product;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ProductRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Product::class);
    }

    public function search(array $filters, string $sort, string $order, int $page, int $perPage): array
    {
        $allowedSort = [
            'name' => 'p.name',
            'price' => 'p.price',
            'createdAt' => 'p.createdAt',
            'stock' => 'p.stock',
        ];
        $sortField = $allowedSort[$sort] ?? 'p.createdAt';
        $sortOrder = strtoupper($order) === 'ASC' ? 'ASC' : 'DESC';

        $qb = $this->createQueryBuilder('p')
            ->leftJoin('p.brand', 'b')->addSelect('b')
            ->leftJoin('p.category', 'c')->addSelect('c');

        if (!empty($filters['name'])) {
            $term = '%' . strtolower($filters['name']) . '%';
            $qb
                ->andWhere('LOWER(p.name) LIKE :term OR LOWER(p.sku) LIKE :term OR LOWER(b.name) LIKE :term')
                ->setParameter('term', $term);
        }
        if (!empty($filters['brand'])) {
            $qb->andWhere('p.brand = :brand')->setParameter('brand', (int) $filters['brand']);
        }
        if (!empty($filters['category'])) {
            $qb->andWhere('p.category = :category')->setParameter('category', (int) $filters['category']);
        }
        if (isset($filters['active']) && $filters['active'] !== '') {
            $qb->andWhere('p.isActive = :active')->setParameter('active', filter_var($filters['active'], FILTER_VALIDATE_BOOLEAN));
        }
        if (!empty($filters['minPrice'])) {
            $qb->andWhere('p.price >= :minPrice')->setParameter('minPrice', $filters['minPrice']);
        }
        if (!empty($filters['maxPrice'])) {
            $qb->andWhere('p.price <= :maxPrice')->setParameter('maxPrice', $filters['maxPrice']);
        }

        $countQb = clone $qb;
        $total = (int) $countQb->select('COUNT(p.id)')->getQuery()->getSingleScalarResult();

        $items = $qb
            ->orderBy($sortField, $sortOrder)
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();

        return ['items' => $items, 'total' => $total];
    }
}
