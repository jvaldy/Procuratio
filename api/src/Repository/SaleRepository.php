<?php

namespace App\Repository;

use App\Entity\Customer;
use App\Entity\Sale;
use App\Entity\Store;
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
        $now = new \DateTimeImmutable('now');
        $qb = $this->createQueryBuilder('s')
            ->where('s.customer = :customerId')
            ->andWhere('s.createdAt <= :now')
            ->setParameter('customerId', $customerId)
            ->setParameter('now', $now);

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

    public function findSuspendedSales(int $page, int $perPage, ?Store $store = null): array
    {
        $now = new \DateTimeImmutable('now');
        $qb = $this->createQueryBuilder('s')
            ->leftJoin('s.customer', 'c')->addSelect('c')
            ->leftJoin('s.store', 'st')->addSelect('st')
            ->where('s.status = :status')
            ->andWhere('s.createdAt <= :now')
            ->setParameter('status', Sale::STATUS_SUSPENDED)
            ->setParameter('now', $now);

        if ($store instanceof Store) {
            $qb->andWhere('s.store = :store')->setParameter('store', $store);
        }

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

    public function findIssuedSales(int $page, int $perPage, ?Store $store = null, ?Customer $customer = null): array
    {
        $now = new \DateTimeImmutable('now');
        $qb = $this->createQueryBuilder('s')
            ->leftJoin('s.customer', 'c')->addSelect('c')
            ->leftJoin('s.store', 'st')->addSelect('st')
            ->where('s.status = :status OR s.paymentStatus = :paymentStatus')
            ->andWhere('s.createdAt <= :now')
            ->setParameter('status', Sale::STATUS_COMPLETED)
            ->setParameter('paymentStatus', Sale::PAYMENT_PAID)
            ->setParameter('now', $now);

        if ($store instanceof Store) {
            $qb->andWhere('s.store = :store')->setParameter('store', $store);
        }

        if ($customer instanceof Customer) {
            $qb->andWhere('s.customer = :customer')->setParameter('customer', $customer);
        }

        $countQb = clone $qb;
        $total = (int) $countQb->select('COUNT(DISTINCT s.id)')->getQuery()->getSingleScalarResult();

        $items = $qb
            ->orderBy('s.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();

        return ['items' => $items, 'total' => $total];
    }
}
