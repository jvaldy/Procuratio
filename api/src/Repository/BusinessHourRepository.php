<?php

namespace App\Repository;

use App\Entity\BusinessHour;
use App\Entity\Store;
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
            ->leftJoin('bh.store', 's')->addSelect('s')
            ->orderBy('bh.dayOfWeek', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findForDay(int $dayOfWeek, ?Store $store = null): ?BusinessHour
    {
        $qb = $this->createQueryBuilder('bh')
            ->andWhere('bh.dayOfWeek = :dayOfWeek')
            ->setParameter('dayOfWeek', $dayOfWeek)
            ->setMaxResults(1);

        if ($store instanceof Store) {
            $qb->andWhere('bh.store = :store')->setParameter('store', $store);
            $result = $qb->getQuery()->getOneOrNullResult();
            if ($result instanceof BusinessHour) {
                return $result;
            }
        }

        return $this->findOneBy(['dayOfWeek' => $dayOfWeek, 'store' => null]);
    }

    /**
     * @return BusinessHour[]
     */
    public function findForStore(?Store $store): array
    {
        $qb = $this->createQueryBuilder('bh')
            ->andWhere('bh.store IS NULL');

        if ($store instanceof Store) {
            $qb = $this->createQueryBuilder('bh')
                ->andWhere('bh.store = :store')
                ->setParameter('store', $store);
        }

        return $qb->orderBy('bh.dayOfWeek', 'ASC')->getQuery()->getResult();
    }
}
