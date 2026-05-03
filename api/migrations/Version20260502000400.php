<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260502000400 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Gap closure: contact client + reservations produits temporaires';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE customers ADD phone_number VARCHAR(30) DEFAULT NULL, ADD birth_date DATE DEFAULT NULL COMMENT \'(DC2Type:date_immutable)\'');
        $this->addSql('CREATE TABLE product_reservations (id INT AUTO_INCREMENT NOT NULL, product_id INT NOT NULL, customer_id INT NOT NULL, quantity INT NOT NULL, status VARCHAR(20) NOT NULL, expires_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', updated_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_7B95B8F64584665A (product_id), INDEX IDX_7B95B8F69395C3F3 (customer_id), INDEX idx_product_reservation_lookup (product_id, status, expires_at), INDEX idx_product_reservation_customer (customer_id, status), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE product_reservations ADD CONSTRAINT FK_7B95B8F64584665A FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE product_reservations ADD CONSTRAINT FK_7B95B8F69395C3F3 FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product_reservations DROP FOREIGN KEY FK_7B95B8F64584665A');
        $this->addSql('ALTER TABLE product_reservations DROP FOREIGN KEY FK_7B95B8F69395C3F3');
        $this->addSql('DROP TABLE product_reservations');
        $this->addSql('ALTER TABLE customers DROP phone_number, DROP birth_date');
    }
}

