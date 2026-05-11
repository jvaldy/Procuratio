<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260509000200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add purchased gift voucher linkage and delivery email to orders';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE orders ADD purchased_gift_voucher_id INT DEFAULT NULL, ADD gift_voucher_delivery_email VARCHAR(180) DEFAULT NULL');
        $this->addSql('ALTER TABLE orders ADD CONSTRAINT FK_E52FFDEE903F6644 FOREIGN KEY (purchased_gift_voucher_id) REFERENCES gift_vouchers (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_E52FFDEE903F6644 ON orders (purchased_gift_voucher_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE orders DROP FOREIGN KEY FK_E52FFDEE903F6644');
        $this->addSql('DROP INDEX IDX_E52FFDEE903F6644 ON orders');
        $this->addSql('ALTER TABLE orders DROP purchased_gift_voucher_id, DROP gift_voucher_delivery_email');
    }
}
