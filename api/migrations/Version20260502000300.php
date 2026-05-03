<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260502000300 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Sprint 7: indexes de stabilisation pour statistiques et agregations temporelles';
    }

    public function up(Schema $schema): void
    {
        $this->createIndexIfMissing('orders', 'idx_orders_status_created_at', 'status, created_at');
        $this->createIndexIfMissing('sales', 'idx_sales_payment_created_at', 'payment_status, created_at');
        $this->createIndexIfMissing('order_items', 'idx_order_items_order_id', 'order_id');
        $this->createIndexIfMissing('sale_items', 'idx_sale_items_sale_id', 'sale_id');
    }

    public function down(Schema $schema): void
    {
        $this->dropIndexIfExists('orders', 'idx_orders_status_created_at');
        $this->dropIndexIfExists('sales', 'idx_sales_payment_created_at');
        $this->dropIndexIfExists('order_items', 'idx_order_items_order_id');
        $this->dropIndexIfExists('sale_items', 'idx_sale_items_sale_id');
    }

    private function createIndexIfMissing(string $table, string $indexName, string $columns): void
    {
        $exists = (int) $this->connection->fetchOne(
            'SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = :table AND index_name = :indexName',
            ['table' => $table, 'indexName' => $indexName]
        ) > 0;

        if (!$exists) {
            $this->addSql(sprintf('CREATE INDEX %s ON %s (%s)', $indexName, $table, $columns));
        }
    }

    private function dropIndexIfExists(string $table, string $indexName): void
    {
        $exists = (int) $this->connection->fetchOne(
            'SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = :table AND index_name = :indexName',
            ['table' => $table, 'indexName' => $indexName]
        ) > 0;

        if ($exists) {
            $this->addSql(sprintf('DROP INDEX %s ON %s', $indexName, $table));
        }
    }
}
