<?php

namespace App\Repository;

use App\Entity\BusinessHour;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class BusinessHourRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, BusinessHour::class);
    }

    /**
     * @return BusinessHour[]
     */
    public function findOrdered(): array
    {
        return $this->createQueryBuilder('bh')
            ->orderBy('bh.dayOfWeek', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findForDay(int $dayOfWeek): ?BusinessHour
    {
        return $this->findOneBy(['dayOfWeek' => $dayOfWeek]);
    }
}
