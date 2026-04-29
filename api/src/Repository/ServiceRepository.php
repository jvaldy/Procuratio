<?php

namespace App\Repository;

use App\Entity\Service;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ServiceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Service::class);
    }

    public function search(array $filters, string $sort, string $order, int $page, int $perPage): array
    {
        $allowedSort = [
            'name' => 's.name',
            'price' => 's.price',
            'createdAt' => 's.createdAt',
        ];
        $sortField = $allowedSort[$sort] ?? 's.createdAt';
        $sortOrder = strtoupper($order) === 'ASC' ? 'ASC' : 'DESC';

        $qb = $this->createQueryBuilder('s')
            ->leftJoin('s.category', 'c')->addSelect('c');

        if (!empty($filters['name'])) {
            $qb->andWhere('LOWER(s.name) LIKE :name')->setParameter('name', '%' . strtolower($filters['name']) . '%');
        }
        if (!empty($filters['category'])) {
            $qb->andWhere('s.category = :category')->setParameter('category', (int) $filters['category']);
        }
        if (isset($filters['active']) && $filters['active'] !== '') {
            $qb->andWhere('s.isActive = :active')->setParameter('active', filter_var($filters['active'], FILTER_VALIDATE_BOOLEAN));
        }
        if (!empty($filters['minPrice'])) {
            $qb->andWhere('s.price >= :minPrice')->setParameter('minPrice', $filters['minPrice']);
        }
        if (!empty($filters['maxPrice'])) {
            $qb->andWhere('s.price <= :maxPrice')->setParameter('maxPrice', $filters['maxPrice']);
        }

        $countQb = clone $qb;
        $total = (int) $countQb->select('COUNT(s.id)')->getQuery()->getSingleScalarResult();

        $items = $qb
            ->orderBy($sortField, $sortOrder)
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();

        return ['items' => $items, 'total' => $total];
    }
}
