<?php

namespace App\Repository;

use App\Entity\Customer;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class CustomerRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Customer::class);
    }

    public function searchByTerm(string $term, int $limit = 8): array
    {
        return $this->createQueryBuilder('c')
            ->join('c.user', 'u')->addSelect('u')
            ->andWhere('LOWER(c.fullName) LIKE :term OR LOWER(u.email) LIKE :term OR c.phoneNumber LIKE :phone')
            ->setParameter('term', '%' . strtolower($term) . '%')
            ->setParameter('phone', '%' . $term . '%')
            ->orderBy('c.fullName', 'ASC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    public function searchPaginated(?string $term, int $page, int $perPage): array
    {
        $qb = $this->createQueryBuilder('c')
            ->join('c.user', 'u')->addSelect('u')
            ->orderBy('c.fullName', 'ASC');

        $term = trim((string) $term);
        if ($term !== '') {
            $qb
                ->andWhere('LOWER(c.fullName) LIKE :term OR LOWER(u.email) LIKE :term OR c.phoneNumber LIKE :phone')
                ->setParameter('term', '%' . strtolower($term) . '%')
                ->setParameter('phone', '%' . $term . '%');
        }

        $total = (clone $qb)
            ->select('COUNT(c.id)')
            ->resetDQLPart('orderBy')
            ->getQuery()
            ->getSingleScalarResult();

        $items = $qb
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();

        return [
            'items' => $items,
            'total' => (int) $total,
        ];
    }
}
