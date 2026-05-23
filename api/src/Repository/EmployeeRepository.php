<?php

namespace App\Repository;

use App\Entity\Employee;
use App\Entity\Store;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class EmployeeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Employee::class);
    }

    public function searchPaginated(?string $term, ?string $status, ?Store $store, int $page, int $perPage): array
    {
        $qb = $this->createQueryBuilder('e')
            ->join('e.user', 'u')->addSelect('u')
            ->leftJoin('e.store', 's')->addSelect('s')
            ->andWhere('u.roles NOT LIKE :managerRole')
            ->setParameter('managerRole', '%ROLE_ADMIN%')
            ->orderBy('e.fullName', 'ASC');

        $term = trim((string) $term);
        if ($term !== '') {
            $qb
                ->andWhere('LOWER(e.fullName) LIKE :term OR LOWER(u.email) LIKE :term OR LOWER(e.jobTitle) LIKE :term')
                ->setParameter('term', '%' . strtolower($term) . '%');
        }

        $status = trim((string) $status);
        if ($status !== '') {
            $qb->andWhere('e.status = :status')->setParameter('status', $status);
        }

        if ($store instanceof Store) {
            $qb->andWhere('e.store = :store')->setParameter('store', $store);
        }

        $total = (int) (clone $qb)->select('COUNT(e.id)')->getQuery()->getSingleScalarResult();
        $items = $qb
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();

        return ['items' => $items, 'total' => $total];
    }

    /**
     * @return Employee[]
     */
    public function findBookable(?Store $store = null): array
    {
        $qb = $this->createQueryBuilder('e')
            ->join('e.user', 'u')
            ->andWhere('e.status = :status')
            ->andWhere('e.isBookable = :bookable')
            ->andWhere('u.roles NOT LIKE :managerRole')
            ->setParameter('status', 'active')
            ->setParameter('bookable', true)
            ->setParameter('managerRole', '%ROLE_ADMIN%')
            ->orderBy('e.fullName', 'ASC');

        if ($store instanceof Store) {
            $qb->andWhere('e.store = :store')->setParameter('store', $store);
        }

        return $qb->getQuery()->getResult();
    }
}
