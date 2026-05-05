<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260503000300 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute vendeur responsable et numero de recu sur les ventes';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE sales ADD seller_id INT DEFAULT NULL, ADD receipt_number VARCHAR(40) DEFAULT NULL');
        $this->addSql('ALTER TABLE sales ADD CONSTRAINT FK_AE3A10C98DE12AB5 FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE SET NULL');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_AE3A10C9600D1DD0 ON sales (receipt_number)');
        $this->addSql('CREATE INDEX IDX_AE3A10C98DE12AB5 ON sales (seller_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE sales DROP FOREIGN KEY FK_AE3A10C98DE12AB5');
        $this->addSql('DROP INDEX UNIQ_AE3A10C9600D1DD0 ON sales');
        $this->addSql('DROP INDEX IDX_AE3A10C98DE12AB5 ON sales');
        $this->addSql('ALTER TABLE sales DROP seller_id, DROP receipt_number');
    }
}
