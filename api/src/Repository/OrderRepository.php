<?php

namespace App\Repository;

use App\Entity\Customer;
use App\Entity\Order;
use App\Entity\Store;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class OrderRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Order::class);
    }

    public function findByCustomer(Customer $customer, int $page, int $perPage): array
    {
        $qb = $this->createQueryBuilder('o')
            ->andWhere('o.customer = :customer')
            ->setParameter('customer', $customer)
            ->orderBy('o.createdAt', 'DESC');

        $countQb = clone $qb;
        $total = (int) $countQb->select('COUNT(o.id)')->getQuery()->getSingleScalarResult();

        $items = $qb
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();

        return ['items' => $items, 'total' => $total];
    }

    public function findForWarehouse(int $page, int $perPage, ?string $search = null, ?string $status = null, ?Store $store = null): array
    {
        $qb = $this->createQueryBuilder('o')
            ->leftJoin('o.store', 's')->addSelect('s')
            ->orderBy('o.createdAt', 'DESC');

        if ($search !== null && trim($search) !== '') {
            $term = '%' . mb_strtolower(trim($search)) . '%';
            $qb
                ->join('o.customer', 'c')
                ->andWhere('LOWER(o.orderNumber) LIKE :term OR LOWER(c.fullName) LIKE :term')
                ->setParameter('term', $term);
        }

        if ($status !== null && trim($status) !== '') {
            $qb
                ->andWhere('o.status = :status')
                ->setParameter('status', trim($status));
        }

        if ($store instanceof Store) {
            $qb->andWhere('o.store = :store')->setParameter('store', $store);
        }

        $countQb = clone $qb;
        $total = (int) $countQb->select('COUNT(o.id)')->getQuery()->getSingleScalarResult();

        $items = $qb
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();

        return ['items' => $items, 'total' => $total];
    }
}
