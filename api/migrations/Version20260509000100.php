<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260509000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add subscription and visit-card fields to loyalty accounts';
    }

    public function up(Schema $schema): void
    {
        $columns = $this->connection->createSchemaManager()->listTableColumns('loyalty_accounts');

        if (!isset($columns['subscription_name'])) {
            $this->addSql('ALTER TABLE loyalty_accounts ADD subscription_name VARCHAR(120) DEFAULT NULL');
        }
        if (!isset($columns['subscription_status'])) {
            $this->addSql("ALTER TABLE loyalty_accounts ADD subscription_status VARCHAR(20) NOT NULL DEFAULT 'inactive'");
        }
        if (!isset($columns['subscription_started_at'])) {
            $this->addSql('ALTER TABLE loyalty_accounts ADD subscription_started_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\'');
        }
        if (!isset($columns['subscription_ends_at'])) {
            $this->addSql('ALTER TABLE loyalty_accounts ADD subscription_ends_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\'');
        }
        if (!isset($columns['visit_card_name'])) {
            $this->addSql('ALTER TABLE loyalty_accounts ADD visit_card_name VARCHAR(120) DEFAULT NULL');
        }
        if (!isset($columns['visit_card_target'])) {
            $this->addSql('ALTER TABLE loyalty_accounts ADD visit_card_target INT DEFAULT NULL');
        }
        if (!isset($columns['visit_card_used'])) {
            $this->addSql('ALTER TABLE loyalty_accounts ADD visit_card_used INT NOT NULL DEFAULT 0');
        }
        if (!isset($columns['visit_card_active'])) {
            $this->addSql('ALTER TABLE loyalty_accounts ADD visit_card_active TINYINT(1) NOT NULL DEFAULT 0');
        }
    }

    public function down(Schema $schema): void
    {
        $columns = $this->connection->createSchemaManager()->listTableColumns('loyalty_accounts');

        foreach ([
            'visit_card_active',
            'visit_card_used',
            'visit_card_target',
            'visit_card_name',
            'subscription_ends_at',
            'subscription_started_at',
            'subscription_status',
            'subscription_name',
        ] as $column) {
            if (isset($columns[$column])) {
                $this->addSql(sprintf('ALTER TABLE loyalty_accounts DROP COLUMN %s', $column));
            }
        }
    }
}
