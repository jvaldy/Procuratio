<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260508000200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add customer gift voucher metadata for purchaser, recipient, service and validity.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE gift_vouchers ADD purchaser_name VARCHAR(120) DEFAULT NULL, ADD recipient_name VARCHAR(120) DEFAULT NULL, ADD service_label VARCHAR(160) DEFAULT NULL, ADD effective_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\', ADD duration_days INT DEFAULT NULL');
        $this->addSql('UPDATE gift_vouchers SET effective_at = created_at WHERE effective_at IS NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE gift_vouchers DROP purchaser_name, DROP recipient_name, DROP service_label, DROP effective_at, DROP duration_days');
    }
}
