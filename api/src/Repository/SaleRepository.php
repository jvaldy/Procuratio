<?php

namespace App\Repository;

use App\Entity\Sale;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class SaleRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Sale::class);
    }

    public function findCustomerHistory(int $customerId, int $page, int $perPage): array
    {
        $qb = $this->createQueryBuilder('s')
            ->where('s.customer = :customerId')
            ->setParameter('customerId', $customerId);

        $countQb = clone $qb;
        $total = (int) $countQb->select('COUNT(s.id)')->getQuery()->getSingleScalarResult();

        $items = $qb
            ->orderBy('s.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();

        return ['items' => $items, 'total' => $total];
    }

    public function findSuspendedSales(int $page, int $perPage): array
    {
        $qb = $this->createQueryBuilder('s')
            ->leftJoin('s.customer', 'c')->addSelect('c')
            ->where('s.status = :status')
            ->setParameter('status', Sale::STATUS_SUSPENDED);

        $countQb = clone $qb;
        $total = (int) $countQb->select('COUNT(s.id)')->getQuery()->getSingleScalarResult();

        $items = $qb
            ->orderBy('s.updatedAt', 'DESC')
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();

        return ['items' => $items, 'total' => $total];
    }
}
