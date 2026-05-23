<?php

namespace App\Repository;

use App\Entity\Employee;
use App\Entity\Store;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\ParameterType;
use Doctrine\Persistence\ManagerRegistry;

class UserRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    public function searchManagersPaginated(?string $term, ?string $status, ?Store $store, int $page, int $perPage): array
    {
        $connection = $this->getEntityManager()->getConnection();
        $conditions = ['JSON_SEARCH(u.roles, \'one\', :managerRole) IS NOT NULL'];
        $params = ['managerRole' => 'ROLE_ADMIN'];
        $types = [];

        $term = trim((string) $term);
        if ($term !== '') {
            $conditions[] = '(LOWER(u.email) LIKE :term OR LOWER(COALESCE(e.full_name, \'\')) LIKE :term OR LOWER(COALESCE(e.job_title, \'\')) LIKE :term)';
            $params['term'] = '%' . strtolower($term) . '%';
        }

        $status = trim((string) $status);
        if ($status !== '') {
            if ($status === 'active') {
                $conditions[] = '(e.status = :status OR e.id IS NULL)';
            } else {
                $conditions[] = 'e.status = :status';
            }
            $params['status'] = $status;
        }

        if ($store instanceof Store) {
            $conditions[] = 'e.store_id = :storeId';
            $params['storeId'] = $store->getId();
        }

        $whereSql = implode(' AND ', $conditions);
        $offset = ($page - 1) * $perPage;

        $total = (int) $connection->fetchOne(
            "SELECT COUNT(DISTINCT u.id)
             FROM users u
             LEFT JOIN employees e ON e.user_id = u.id
             WHERE $whereSql",
            $params,
            $types
        );

        $items = $connection->fetchAllAssociative(
            "SELECT
                u.id,
                COALESCE(e.full_name, SUBSTRING_INDEX(u.email, '@', 1)) AS fullName,
                u.email,
                e.job_title AS jobTitle,
                e.phone_number AS phoneNumber,
                COALESCE(e.status, 'active') AS status,
                e.archived_at AS archivedAt,
                u.created_at AS createdAt,
                s.id AS storeId,
                s.name AS storeName
             FROM users u
             LEFT JOIN employees e ON e.user_id = u.id
             LEFT JOIN stores s ON s.id = e.store_id
             WHERE $whereSql
             ORDER BY u.email ASC
             LIMIT :limit OFFSET :offset",
            [...$params, 'limit' => $perPage, 'offset' => $offset],
            [...$types, 'limit' => ParameterType::INTEGER, 'offset' => ParameterType::INTEGER]
        );

        return [
            'items' => array_map(static function (array $row): array {
                return [
                    'id' => (int) $row['id'],
                    'fullName' => (string) $row['fullName'],
                    'email' => (string) $row['email'],
                    'jobTitle' => $row['jobTitle'] ?: null,
                    'phoneNumber' => $row['phoneNumber'] ?: null,
                    'status' => (string) $row['status'],
                    'archivedAt' => $row['archivedAt'] ? (new \DateTimeImmutable((string) $row['archivedAt']))->format(DATE_ATOM) : null,
                    'store' => $row['storeId'] ? [
                        'id' => (int) $row['storeId'],
                        'name' => (string) $row['storeName'],
                    ] : null,
                    'createdAt' => (new \DateTimeImmutable((string) $row['createdAt']))->format(DATE_ATOM),
                    'accessLevel' => 'manager',
                ];
            }, $items),
            'total' => $total,
        ];
    }
}
