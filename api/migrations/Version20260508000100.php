<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260508000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute les informations d adresse de livraison sur les commandes e-commerce.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE orders ADD delivery_full_name VARCHAR(160) DEFAULT NULL, ADD delivery_address_line1 VARCHAR(255) DEFAULT NULL, ADD delivery_address_line2 VARCHAR(255) DEFAULT NULL, ADD delivery_postal_code VARCHAR(40) DEFAULT NULL, ADD delivery_city VARCHAR(120) DEFAULT NULL, ADD delivery_country VARCHAR(120) DEFAULT NULL, ADD delivery_instructions VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE orders DROP delivery_full_name, DROP delivery_address_line1, DROP delivery_address_line2, DROP delivery_postal_code, DROP delivery_city, DROP delivery_country, DROP delivery_instructions');
    }
}
