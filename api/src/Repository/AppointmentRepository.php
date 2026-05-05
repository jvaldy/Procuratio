<?php

namespace App\Repository;

use App\Entity\Appointment;
use App\Entity\Customer;
use App\Entity\Employee;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class AppointmentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Appointment::class);
    }

    public function hasConflict(Employee $employee, \DateTimeImmutable $startAt, \DateTimeImmutable $endAt, ?int $excludeId = null): bool
    {
        $qb = $this->createQueryBuilder('a')
            ->select('COUNT(a.id)')
            ->where('a.employee = :employee')
            ->andWhere('a.status != :cancelled')
            ->andWhere('a.startAt < :endAt')
            ->andWhere('a.endAt > :startAt')
            ->setParameter('employee', $employee)
            ->setParameter('cancelled', Appointment::STATUS_CANCELLED)
            ->setParameter('startAt', $startAt)
            ->setParameter('endAt', $endAt);

        if ($excludeId) {
            $qb->andWhere('a.id != :excludeId')->setParameter('excludeId', $excludeId);
        }

        return (int) $qb->getQuery()->getSingleScalarResult() > 0;
    }

    public function hasCustomerConflict(Customer $customer, \DateTimeImmutable $startAt, \DateTimeImmutable $endAt, ?int $excludeId = null): bool
    {
        $qb = $this->createQueryBuilder('a')
            ->select('COUNT(a.id)')
            ->where('a.customer = :customer')
            ->andWhere('a.status != :cancelled')
            ->andWhere('a.startAt < :endAt')
            ->andWhere('a.endAt > :startAt')
            ->setParameter('customer', $customer)
            ->setParameter('cancelled', Appointment::STATUS_CANCELLED)
            ->setParameter('startAt', $startAt)
            ->setParameter('endAt', $endAt);

        if ($excludeId) {
            $qb->andWhere('a.id != :excludeId')->setParameter('excludeId', $excludeId);
        }

        return (int) $qb->getQuery()->getSingleScalarResult() > 0;
    }

    /**
     * @return Appointment[]
     */
    public function findByRange(\DateTimeImmutable $from, \DateTimeImmutable $to, ?int $employeeId = null): array
    {
        $qb = $this->createQueryBuilder('a')
            ->leftJoin('a.employee', 'e')->addSelect('e')
            ->leftJoin('a.customer', 'c')->addSelect('c')
            ->leftJoin('a.services', 'aps')->addSelect('aps')
            ->leftJoin('aps.service', 's')->addSelect('s')
            ->where('a.startAt >= :from')
            ->andWhere('a.startAt < :to')
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->orderBy('a.startAt', 'ASC');

        if ($employeeId) {
            $qb->andWhere('e.id = :employeeId')->setParameter('employeeId', $employeeId);
        }

        return $qb->getQuery()->getResult();
    }
}
