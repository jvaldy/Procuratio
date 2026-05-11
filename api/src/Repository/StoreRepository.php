<?php

namespace App\Repository;

use App\Entity\Store;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class StoreRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Store::class);
    }

    public function searchPaginated(?string $term, int $page, int $perPage): array
    {
        $qb = $this->createQueryBuilder('s')
            ->orderBy('s.name', 'ASC');

        $term = trim((string) $term);
        if ($term !== '') {
            $qb
                ->andWhere('LOWER(s.name) LIKE :term OR LOWER(s.code) LIKE :term OR LOWER(s.city) LIKE :term')
                ->setParameter('term', '%' . strtolower($term) . '%');
        }

        $total = (int) (clone $qb)->select('COUNT(s.id)')->getQuery()->getSingleScalarResult();
        $items = $qb
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();

        return ['items' => $items, 'total' => $total];
    }

    /**
     * @return Store[]
     */
    public function findActive(): array
    {
        return $this->findBy(['status' => 'active'], ['name' => 'ASC']);
    }
}
