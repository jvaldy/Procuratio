<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260510000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add stores, employee statuses, user preferences, loyalty receipt fields, and review tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE stores (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(120) NOT NULL, code VARCHAR(40) NOT NULL, email VARCHAR(180) DEFAULT NULL, phone_number VARCHAR(30) DEFAULT NULL, address_line1 VARCHAR(255) DEFAULT NULL, address_line2 VARCHAR(255) DEFAULT NULL, postal_code VARCHAR(40) DEFAULT NULL, city VARCHAR(120) DEFAULT NULL, country VARCHAR(120) DEFAULT NULL, status VARCHAR(20) NOT NULL, theme_color VARCHAR(20) NOT NULL, created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', updated_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', UNIQUE INDEX UNIQ_6C3B1A5F77153098 (code), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql("INSERT INTO stores (name, code, email, phone_number, address_line1, postal_code, city, country, status, theme_color, created_at, updated_at) VALUES ('Seanergy Main Store', 'MAIN', 'main@procuratio.local', '+33100000000', '12 Main Avenue', '75001', 'Paris', 'France', 'active', 'soft', NOW(), NOW())");

        $this->addSql("ALTER TABLE users ADD preferred_language VARCHAR(10) NOT NULL DEFAULT 'en', ADD theme VARCHAR(20) NOT NULL DEFAULT 'soft', ADD font_size VARCHAR(20) NOT NULL DEFAULT 'medium'");
        $this->addSql("ALTER TABLE employees ADD job_title VARCHAR(120) DEFAULT NULL, ADD phone_number VARCHAR(30) DEFAULT NULL, ADD status VARCHAR(20) NOT NULL DEFAULT 'active', ADD is_bookable TINYINT(1) NOT NULL DEFAULT 1, ADD archived_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)', ADD store_id INT DEFAULT NULL");
        $this->addSql("ALTER TABLE customers ADD preferred_store_id INT DEFAULT NULL");
        $this->addSql("ALTER TABLE appointments ADD store_id INT DEFAULT NULL");
        $this->addSql("ALTER TABLE orders ADD store_id INT DEFAULT NULL");
        $this->addSql("ALTER TABLE product_reservations ADD store_id INT DEFAULT NULL");
        $this->addSql("ALTER TABLE sales ADD store_id INT DEFAULT NULL, ADD loyalty_points_earned INT NOT NULL DEFAULT 0");
        $this->addSql("ALTER TABLE business_hours ADD store_id INT DEFAULT NULL");

        $this->addSql("CREATE TABLE product_reviews (id INT AUTO_INCREMENT NOT NULL, product_id INT NOT NULL, customer_id INT NOT NULL, rating INT NOT NULL, comment LONGTEXT NOT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX IDX_2553F32E4584665A (product_id), INDEX IDX_2553F32E9395C3F3 (customer_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE store_reviews (id INT AUTO_INCREMENT NOT NULL, store_id INT NOT NULL, customer_id INT NOT NULL, rating INT NOT NULL, comment LONGTEXT NOT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX IDX_738C26F9B092A811 (store_id), INDEX IDX_738C26F99395C3F3 (customer_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");

        $this->addSql("CREATE INDEX IDX_62809DBA11A2B6FA ON employees (store_id)");
        $this->addSql("CREATE INDEX IDX_81398E09BF396750 ON customers (preferred_store_id)");
        $this->addSql("CREATE INDEX IDX_F0618D4A11A2B6FA ON appointments (store_id)");
        $this->addSql("CREATE INDEX IDX_E52FFDEA11A2B6FA ON orders (store_id)");
        $this->addSql("CREATE INDEX IDX_F263C9A311A2B6FA ON product_reservations (store_id)");
        $this->addSql("CREATE INDEX IDX_94239D6A11A2B6FA ON sales (store_id)");
        $this->addSql("CREATE INDEX IDX_53805FB11A2B6FA ON business_hours (store_id)");

        $this->addSql('ALTER TABLE employees ADD CONSTRAINT FK_62809DBA11A2B6FA FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE customers ADD CONSTRAINT FK_81398E09BF396750 FOREIGN KEY (preferred_store_id) REFERENCES stores (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE appointments ADD CONSTRAINT FK_F0618D4A11A2B6FA FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE orders ADD CONSTRAINT FK_E52FFDEA11A2B6FA FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE product_reservations ADD CONSTRAINT FK_F263C9A311A2B6FA FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE sales ADD CONSTRAINT FK_94239D6A11A2B6FA FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE business_hours ADD CONSTRAINT FK_53805FB11A2B6FA FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE product_reviews ADD CONSTRAINT FK_2553F32E4584665A FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE product_reviews ADD CONSTRAINT FK_2553F32E9395C3F3 FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE store_reviews ADD CONSTRAINT FK_738C26F9B092A811 FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE store_reviews ADD CONSTRAINT FK_738C26F99395C3F3 FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE');

        $this->addSql("UPDATE employees SET store_id = (SELECT id FROM stores WHERE code = 'MAIN' LIMIT 1) WHERE store_id IS NULL");
        $this->addSql("UPDATE customers SET preferred_store_id = (SELECT id FROM stores WHERE code = 'MAIN' LIMIT 1) WHERE preferred_store_id IS NULL");
        $this->addSql("UPDATE appointments SET store_id = (SELECT id FROM stores WHERE code = 'MAIN' LIMIT 1) WHERE store_id IS NULL");
        $this->addSql("UPDATE orders SET store_id = (SELECT id FROM stores WHERE code = 'MAIN' LIMIT 1) WHERE store_id IS NULL");
        $this->addSql("UPDATE product_reservations SET store_id = (SELECT id FROM stores WHERE code = 'MAIN' LIMIT 1) WHERE store_id IS NULL");
        $this->addSql("UPDATE sales SET store_id = (SELECT id FROM stores WHERE code = 'MAIN' LIMIT 1) WHERE store_id IS NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product_reviews DROP FOREIGN KEY FK_2553F32E4584665A');
        $this->addSql('ALTER TABLE product_reviews DROP FOREIGN KEY FK_2553F32E9395C3F3');
        $this->addSql('ALTER TABLE store_reviews DROP FOREIGN KEY FK_738C26F9B092A811');
        $this->addSql('ALTER TABLE store_reviews DROP FOREIGN KEY FK_738C26F99395C3F3');
        $this->addSql('ALTER TABLE employees DROP FOREIGN KEY FK_62809DBA11A2B6FA');
        $this->addSql('ALTER TABLE customers DROP FOREIGN KEY FK_81398E09BF396750');
        $this->addSql('ALTER TABLE appointments DROP FOREIGN KEY FK_F0618D4A11A2B6FA');
        $this->addSql('ALTER TABLE orders DROP FOREIGN KEY FK_E52FFDEA11A2B6FA');
        $this->addSql('ALTER TABLE product_reservations DROP FOREIGN KEY FK_F263C9A311A2B6FA');
        $this->addSql('ALTER TABLE sales DROP FOREIGN KEY FK_94239D6A11A2B6FA');
        $this->addSql('ALTER TABLE business_hours DROP FOREIGN KEY FK_53805FB11A2B6FA');
        $this->addSql('DROP TABLE product_reviews');
        $this->addSql('DROP TABLE store_reviews');
        $this->addSql('DROP INDEX IDX_62809DBA11A2B6FA ON employees');
        $this->addSql('DROP INDEX IDX_81398E09BF396750 ON customers');
        $this->addSql('DROP INDEX IDX_F0618D4A11A2B6FA ON appointments');
        $this->addSql('DROP INDEX IDX_E52FFDEA11A2B6FA ON orders');
        $this->addSql('DROP INDEX IDX_F263C9A311A2B6FA ON product_reservations');
        $this->addSql('DROP INDEX IDX_94239D6A11A2B6FA ON sales');
        $this->addSql('DROP INDEX IDX_53805FB11A2B6FA ON business_hours');
        $this->addSql('ALTER TABLE employees DROP job_title, DROP phone_number, DROP status, DROP is_bookable, DROP archived_at, DROP store_id');
        $this->addSql('ALTER TABLE customers DROP preferred_store_id');
        $this->addSql('ALTER TABLE appointments DROP store_id');
        $this->addSql('ALTER TABLE orders DROP store_id');
        $this->addSql('ALTER TABLE product_reservations DROP store_id');
        $this->addSql('ALTER TABLE sales DROP store_id, DROP loyalty_points_earned');
        $this->addSql('ALTER TABLE business_hours DROP store_id');
        $this->addSql('ALTER TABLE users DROP preferred_language, DROP theme, DROP font_size');
        $this->addSql('DROP TABLE stores');
    }
}
