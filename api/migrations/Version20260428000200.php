<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260428000200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Sprint 1 stock/services schema upgrade';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE brands (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(100) NOT NULL, is_active TINYINT(1) NOT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', UNIQUE INDEX UNIQ_AE4363DF5E237E06 (name), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE categories (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(100) NOT NULL, is_active TINYINT(1) NOT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', UNIQUE INDEX UNIQ_3AF346687E237E06 (name), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE stock_movements (id INT AUTO_INCREMENT NOT NULL, product_id INT NOT NULL, movement_type VARCHAR(16) NOT NULL, quantity INT NOT NULL, previous_stock INT NOT NULL, new_stock INT NOT NULL, reason VARCHAR(120) NOT NULL, comment LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX IDX_7C0B8A454584665A (product_id), INDEX idx_stock_movements_created_at (created_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");

        $this->addSql("ALTER TABLE products ADD brand_id INT NOT NULL, ADD category_id INT NOT NULL, ADD is_active TINYINT(1) NOT NULL DEFAULT 1, ADD created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', ADD updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)'");
        $this->addSql('UPDATE products SET created_at = NOW(), updated_at = NOW()');
        $this->addSql('ALTER TABLE products ADD CONSTRAINT FK_B3BA5A5A44F5D008 FOREIGN KEY (brand_id) REFERENCES brands (id)');
        $this->addSql('ALTER TABLE products ADD CONSTRAINT FK_B3BA5A5A12469DE2 FOREIGN KEY (category_id) REFERENCES categories (id)');
        $this->addSql('CREATE INDEX IDX_B3BA5A5A44F5D008 ON products (brand_id)');
        $this->addSql('CREATE INDEX IDX_B3BA5A5A12469DE2 ON products (category_id)');
        $this->addSql('CREATE INDEX idx_products_name ON products (name)');
        $this->addSql('CREATE INDEX idx_products_price ON products (price)');
        $this->addSql('CREATE INDEX idx_products_stock ON products (stock)');
        $this->addSql('CREATE INDEX idx_products_created_at ON products (created_at)');

        $this->addSql("ALTER TABLE services ADD category_id INT DEFAULT NULL, ADD is_active TINYINT(1) NOT NULL DEFAULT 1, ADD created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', ADD CONSTRAINT FK_DA6C3C2312469DE2 FOREIGN KEY (category_id) REFERENCES categories (id)");
        $this->addSql('UPDATE services SET created_at = NOW()');
        $this->addSql('CREATE INDEX IDX_DA6C3C2312469DE2 ON services (category_id)');
        $this->addSql('CREATE INDEX idx_services_name ON services (name)');
        $this->addSql('CREATE INDEX idx_services_price ON services (price)');
        $this->addSql('CREATE INDEX idx_services_created_at ON services (created_at)');

        $this->addSql('ALTER TABLE stock_movements ADD CONSTRAINT FK_7C0B8A454584665A FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE stock_movements DROP FOREIGN KEY FK_7C0B8A454584665A');
        $this->addSql('ALTER TABLE products DROP FOREIGN KEY FK_B3BA5A5A44F5D008');
        $this->addSql('ALTER TABLE products DROP FOREIGN KEY FK_B3BA5A5A12469DE2');
        $this->addSql('ALTER TABLE services DROP FOREIGN KEY FK_DA6C3C2312469DE2');

        $this->addSql('DROP TABLE stock_movements');
        $this->addSql('DROP TABLE brands');
        $this->addSql('DROP TABLE categories');

        $this->addSql('ALTER TABLE products DROP brand_id, DROP category_id, DROP is_active, DROP created_at, DROP updated_at');
        $this->addSql('ALTER TABLE services DROP category_id, DROP is_active, DROP created_at');
    }
}
