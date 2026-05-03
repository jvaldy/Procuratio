<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260503000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute image/description sur products et composition sur services';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE products ADD description LONGTEXT DEFAULT NULL, ADD image_url VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE services ADD composition LONGTEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE services DROP composition');
        $this->addSql('ALTER TABLE products DROP description, DROP image_url');
    }
}
