<?php

namespace App\Repository;

use App\Entity\AppointmentStatusHistory;
use App\Entity\Customer;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class AppointmentStatusHistoryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AppointmentStatusHistory::class);
    }

    /**
     * @return AppointmentStatusHistory[]
     */
    public function findByCustomer(Customer $customer, int $limit = 200): array
    {
        return $this->createQueryBuilder('h')
            ->leftJoin('h.appointment', 'a')->addSelect('a')
            ->where('h.customer = :customer')
            ->setParameter('customer', $customer)
            ->orderBy('h.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }
}

