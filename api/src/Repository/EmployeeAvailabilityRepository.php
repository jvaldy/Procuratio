<?php

namespace App\Repository;

use App\Entity\Employee;
use App\Entity\EmployeeAvailability;
use App\Entity\Store;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class EmployeeAvailabilityRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EmployeeAvailability::class);
    }

    /**
     * @return EmployeeAvailability[]
     */
    public function findForEmployeeAndDay(Employee $employee, int $dayOfWeek): array
    {
        return $this->createQueryBuilder('ea')
            ->where('ea.employee = :employee')
            ->andWhere('ea.dayOfWeek = :dayOfWeek')
            ->setParameter('employee', $employee)
            ->setParameter('dayOfWeek', $dayOfWeek)
            ->orderBy('ea.startTime', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return EmployeeAvailability[]
     */
    public function findForStoreAndDay(Store $store, int $dayOfWeek): array
    {
        return $this->createQueryBuilder('ea')
            ->innerJoin('ea.employee', 'e')
            ->where('e.store = :store')
            ->andWhere('ea.dayOfWeek = :dayOfWeek')
            ->setParameter('store', $store)
            ->setParameter('dayOfWeek', $dayOfWeek)
            ->orderBy('e.id', 'ASC')
            ->addOrderBy('ea.startTime', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
