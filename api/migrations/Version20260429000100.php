<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260429000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Sprint 2 POS: sales, sale items, suspended tickets and payments';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE sales (id INT AUTO_INCREMENT NOT NULL, customer_id INT DEFAULT NULL, status VARCHAR(20) NOT NULL, payment_status VARCHAR(20) NOT NULL, sub_total NUMERIC(10, 2) NOT NULL, discount_total NUMERIC(10, 2) NOT NULL, tax_total NUMERIC(10, 2) NOT NULL, total NUMERIC(10, 2) NOT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX IDX_E54BC0059395C3F3 (customer_id), INDEX idx_sales_created_at (created_at), INDEX idx_sales_status (status), INDEX idx_sales_payment_status (payment_status), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE sale_items (id INT AUTO_INCREMENT NOT NULL, sale_id INT NOT NULL, item_type VARCHAR(20) NOT NULL, item_id INT NOT NULL, label VARCHAR(160) NOT NULL, unit_price NUMERIC(10, 2) NOT NULL, quantity NUMERIC(10, 2) NOT NULL, discount_amount NUMERIC(10, 2) NOT NULL, tax_rate NUMERIC(5, 2) NOT NULL, line_total NUMERIC(10, 2) NOT NULL, INDEX IDX_57B8B0FA2AAE3D6F (sale_id), INDEX idx_sale_items_item (item_type, item_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE suspended_tickets (id INT AUTO_INCREMENT NOT NULL, sale_id INT NOT NULL, reason VARCHAR(255) DEFAULT NULL, suspended_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', resumed_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)', UNIQUE INDEX UNIQ_2D6D94882AAE3D6F (sale_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE payments (id INT AUTO_INCREMENT NOT NULL, sale_id INT NOT NULL, method VARCHAR(20) NOT NULL, amount NUMERIC(10, 2) NOT NULL, status VARCHAR(20) NOT NULL, paid_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', external_ref VARCHAR(80) DEFAULT NULL, INDEX IDX_65D29B322AAE3D6F (sale_id), INDEX idx_payments_paid_at (paid_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");

        $this->addSql('ALTER TABLE sales ADD CONSTRAINT FK_E54BC0059395C3F3 FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE sale_items ADD CONSTRAINT FK_57B8B0FA2AAE3D6F FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE suspended_tickets ADD CONSTRAINT FK_2D6D94882AAE3D6F FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE payments ADD CONSTRAINT FK_65D29B322AAE3D6F FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE sales DROP FOREIGN KEY FK_E54BC0059395C3F3');
        $this->addSql('ALTER TABLE sale_items DROP FOREIGN KEY FK_57B8B0FA2AAE3D6F');
        $this->addSql('ALTER TABLE suspended_tickets DROP FOREIGN KEY FK_2D6D94882AAE3D6F');
        $this->addSql('ALTER TABLE payments DROP FOREIGN KEY FK_65D29B322AAE3D6F');
        $this->addSql('DROP TABLE payments');
        $this->addSql('DROP TABLE suspended_tickets');
        $this->addSql('DROP TABLE sale_items');
        $this->addSql('DROP TABLE sales');
    }
}

