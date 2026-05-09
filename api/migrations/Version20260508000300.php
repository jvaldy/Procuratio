<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260508000300 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Store the gift voucher applied to carts and orders.';
    }

    public function up(Schema $schema): void
    {
        $schemaManager = $this->connection->createSchemaManager();
        $cartTable = $schemaManager->introspectTable('carts');
        $orderTable = $schemaManager->introspectTable('orders');

        if (!$cartTable->hasColumn('applied_gift_voucher_id')) {
            $this->addSql('ALTER TABLE carts ADD applied_gift_voucher_id INT DEFAULT NULL');
        }

        if (!$orderTable->hasColumn('gift_voucher_id')) {
            $this->addSql('ALTER TABLE orders ADD gift_voucher_id INT DEFAULT NULL');
        }

        if (!$orderTable->hasColumn('gift_voucher_amount')) {
            $this->addSql("ALTER TABLE orders ADD gift_voucher_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL");
        }

        $cartTable = $schemaManager->introspectTable('carts');
        $orderTable = $schemaManager->introspectTable('orders');

        if (!$cartTable->hasIndex('IDX_BA388B7D4F614549')) {
            $this->addSql('CREATE INDEX IDX_BA388B7D4F614549 ON carts (applied_gift_voucher_id)');
        }

        if (!$orderTable->hasIndex('IDX_F52993984F614549')) {
            $this->addSql('CREATE INDEX IDX_F52993984F614549 ON orders (gift_voucher_id)');
        }

        $cartForeignKeys = array_map(static fn($foreignKey) => $foreignKey->getName(), $cartTable->getForeignKeys());
        $orderForeignKeys = array_map(static fn($foreignKey) => $foreignKey->getName(), $orderTable->getForeignKeys());

        if (!in_array('FK_BA388B7D4F614549', $cartForeignKeys, true)) {
            $this->addSql('ALTER TABLE carts ADD CONSTRAINT FK_BA388B7D4F614549 FOREIGN KEY (applied_gift_voucher_id) REFERENCES gift_vouchers (id) ON DELETE SET NULL');
        }

        if (!in_array('FK_F52993984F614549', $orderForeignKeys, true)) {
            $this->addSql('ALTER TABLE orders ADD CONSTRAINT FK_F52993984F614549 FOREIGN KEY (gift_voucher_id) REFERENCES gift_vouchers (id) ON DELETE SET NULL');
        }
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE carts DROP CONSTRAINT FK_BA388B7D4F614549');
        $this->addSql('ALTER TABLE orders DROP CONSTRAINT FK_F52993984F614549');
        $this->addSql('DROP INDEX IDX_BA388B7D4F614549');
        $this->addSql('DROP INDEX IDX_F52993984F614549');
        $this->addSql('ALTER TABLE carts DROP applied_gift_voucher_id');
        $this->addSql('ALTER TABLE orders DROP gift_voucher_id, DROP gift_voucher_amount');
    }
}
