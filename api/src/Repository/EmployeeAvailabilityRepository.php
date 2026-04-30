<?php

namespace App\Repository;

use App\Entity\Employee;
use App\Entity\EmployeeAvailability;
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
}

