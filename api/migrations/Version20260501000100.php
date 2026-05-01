<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260501000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Sprint 4 e-commerce: carts, orders, order_items, payment_events';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE carts (id INT AUTO_INCREMENT NOT NULL, customer_id INT NOT NULL, status VARCHAR(20) NOT NULL, currency VARCHAR(3) NOT NULL, items JSON NOT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX IDX_BA388B79395C3F3 (customer_id), INDEX idx_carts_customer_status (customer_id, status), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE orders (id INT AUTO_INCREMENT NOT NULL, customer_id INT NOT NULL, order_number VARCHAR(40) NOT NULL, status VARCHAR(32) NOT NULL, sub_total NUMERIC(10, 2) NOT NULL, tax_total NUMERIC(10, 2) NOT NULL, total NUMERIC(10, 2) NOT NULL, currency VARCHAR(3) NOT NULL, stripe_payment_intent_id VARCHAR(120) DEFAULT NULL, stripe_client_secret VARCHAR(255) DEFAULT NULL, pickup_in_store TINYINT(1) NOT NULL, pickup_slot VARCHAR(100) DEFAULT NULL, pickup_note VARCHAR(255) DEFAULT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', UNIQUE INDEX UNIQ_E52FFDEEE4B8CD8 (order_number), UNIQUE INDEX UNIQ_E52FFDEE37D4B3EA (stripe_payment_intent_id), INDEX IDX_E52FFDE79395C3F3 (customer_id), INDEX idx_orders_status_created_at (status, created_at), INDEX idx_orders_customer_created_at (customer_id, created_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE order_items (id INT AUTO_INCREMENT NOT NULL, order_id INT NOT NULL, product_id INT NOT NULL, product_name VARCHAR(120) NOT NULL, product_sku VARCHAR(40) NOT NULL, quantity INT NOT NULL, unit_price NUMERIC(10, 2) NOT NULL, line_total NUMERIC(10, 2) NOT NULL, INDEX IDX_62809DBE8D9F6D38 (order_id), INDEX IDX_62809DBE4584665A (product_id), INDEX idx_order_items_order_id (order_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE payment_events (id INT AUTO_INCREMENT NOT NULL, order_id INT DEFAULT NULL, provider_event_id VARCHAR(120) DEFAULT NULL, provider VARCHAR(80) NOT NULL, event_type VARCHAR(120) NOT NULL, signature_valid TINYINT(1) NOT NULL, payload JSON NOT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', UNIQUE INDEX UNIQ_8310A6F26F56403A (provider_event_id), INDEX IDX_8310A6F28D9F6D38 (order_id), INDEX idx_payment_events_provider_created_at (provider, created_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");

        $this->addSql('ALTER TABLE carts ADD CONSTRAINT FK_BA388B79395C3F3 FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE orders ADD CONSTRAINT FK_E52FFDE79395C3F3 FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE order_items ADD CONSTRAINT FK_62809DBE8D9F6D38 FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE order_items ADD CONSTRAINT FK_62809DBE4584665A FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT');
        $this->addSql('ALTER TABLE payment_events ADD CONSTRAINT FK_8310A6F28D9F6D38 FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE carts DROP FOREIGN KEY FK_BA388B79395C3F3');
        $this->addSql('ALTER TABLE orders DROP FOREIGN KEY FK_E52FFDE79395C3F3');
        $this->addSql('ALTER TABLE order_items DROP FOREIGN KEY FK_62809DBE8D9F6D38');
        $this->addSql('ALTER TABLE order_items DROP FOREIGN KEY FK_62809DBE4584665A');
        $this->addSql('ALTER TABLE payment_events DROP FOREIGN KEY FK_8310A6F28D9F6D38');
        $this->addSql('DROP TABLE carts');
        $this->addSql('DROP TABLE orders');
        $this->addSql('DROP TABLE order_items');
        $this->addSql('DROP TABLE payment_events');
    }
}

