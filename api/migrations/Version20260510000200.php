<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260510000200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add appointment pricing snapshots and link orders to appointments';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE appointment_services ADD unit_price NUMERIC(10, 2) NOT NULL DEFAULT '0.00'");
        $this->addSql('ALTER TABLE orders ADD appointment_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE orders ADD CONSTRAINT FK_E52FFDEE5DA1941A FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_E52FFDEE5DA1941A ON orders (appointment_id)');
        $this->addSql('UPDATE appointment_services aps INNER JOIN services s ON aps.service_id = s.id SET aps.unit_price = s.price');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE orders DROP FOREIGN KEY FK_E52FFDEE5DA1941A');
        $this->addSql('DROP INDEX IDX_E52FFDEE5DA1941A ON orders');
        $this->addSql('ALTER TABLE orders DROP appointment_id');
        $this->addSql('ALTER TABLE appointment_services DROP unit_price');
    }
}
