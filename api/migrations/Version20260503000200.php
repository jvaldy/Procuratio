<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260503000200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Etend products.image_url en LONGTEXT pour accepter les images en data URL';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE products MODIFY image_url LONGTEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE products MODIFY image_url VARCHAR(255) DEFAULT NULL');
    }
}
