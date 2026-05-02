<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260502000200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Sprint 6 CRM: loyalty, campaigns, gift vouchers, notification logs, reminder rules';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE loyalty_accounts (id INT AUTO_INCREMENT NOT NULL, customer_id INT NOT NULL, points_balance INT NOT NULL, is_active TINYINT(1) NOT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX IDX_1EBB311E395C3F3 (customer_id), INDEX idx_loyalty_accounts_customer_updated (customer_id, updated_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE loyalty_events (id INT AUTO_INCREMENT NOT NULL, customer_id INT NOT NULL, account_id INT NOT NULL, event_type VARCHAR(20) NOT NULL, points_delta INT NOT NULL, balance_after INT NOT NULL, reason LONGTEXT DEFAULT NULL, expires_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)', created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX IDX_68F6AE6395C3F3 (customer_id), INDEX IDX_68F6AEE9B359 (account_id), INDEX idx_loyalty_events_customer_created (customer_id, created_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE campaigns (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(120) NOT NULL, channel VARCHAR(20) NOT NULL, status VARCHAR(20) NOT NULL, segment JSON NOT NULL, message_template LONGTEXT NOT NULL, target_count INT NOT NULL, sent_count INT NOT NULL, failed_count INT NOT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX idx_campaigns_status_created (status, created_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE gift_vouchers (id INT AUTO_INCREMENT NOT NULL, customer_id INT DEFAULT NULL, code VARCHAR(40) NOT NULL, initial_amount NUMERIC(10, 2) NOT NULL, balance_amount NUMERIC(10, 2) NOT NULL, status VARCHAR(20) NOT NULL, expires_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)', created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', UNIQUE INDEX UNIQ_6E58A7B477153098 (code), INDEX IDX_6E58A7B4395C3F3 (customer_id), INDEX idx_gift_vouchers_code (code), INDEX idx_gift_vouchers_status_created (status, created_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE reminder_rules (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(80) NOT NULL, channel VARCHAR(20) NOT NULL, offset_hours INT NOT NULL, is_active TINYINT(1) NOT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE notification_logs (id INT AUTO_INCREMENT NOT NULL, customer_id INT DEFAULT NULL, campaign_id INT DEFAULT NULL, appointment_id INT DEFAULT NULL, kind VARCHAR(40) NOT NULL, channel VARCHAR(20) NOT NULL, status VARCHAR(20) NOT NULL, payload JSON NOT NULL, error_message LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX IDX_F9138D32395C3F3 (customer_id), INDEX IDX_F9138D3274DF51DF (campaign_id), INDEX IDX_F9138D32758A6656 (appointment_id), INDEX idx_notification_logs_status_created (status, created_at), INDEX idx_notification_logs_customer_created (customer_id, created_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");

        $this->addSql('ALTER TABLE loyalty_accounts ADD CONSTRAINT FK_1EBB311E395C3F3 FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE loyalty_events ADD CONSTRAINT FK_68F6AE6395C3F3 FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE loyalty_events ADD CONSTRAINT FK_68F6AEE9B359 FOREIGN KEY (account_id) REFERENCES loyalty_accounts (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE gift_vouchers ADD CONSTRAINT FK_6E58A7B4395C3F3 FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE notification_logs ADD CONSTRAINT FK_F9138D32395C3F3 FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE notification_logs ADD CONSTRAINT FK_F9138D3274DF51DF FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE notification_logs ADD CONSTRAINT FK_F9138D32758A6656 FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE loyalty_accounts DROP FOREIGN KEY FK_1EBB311E395C3F3');
        $this->addSql('ALTER TABLE loyalty_events DROP FOREIGN KEY FK_68F6AE6395C3F3');
        $this->addSql('ALTER TABLE loyalty_events DROP FOREIGN KEY FK_68F6AEE9B359');
        $this->addSql('ALTER TABLE gift_vouchers DROP FOREIGN KEY FK_6E58A7B4395C3F3');
        $this->addSql('ALTER TABLE notification_logs DROP FOREIGN KEY FK_F9138D32395C3F3');
        $this->addSql('ALTER TABLE notification_logs DROP FOREIGN KEY FK_F9138D3274DF51DF');
        $this->addSql('ALTER TABLE notification_logs DROP FOREIGN KEY FK_F9138D32758A6656');
        $this->addSql('DROP TABLE loyalty_accounts');
        $this->addSql('DROP TABLE loyalty_events');
        $this->addSql('DROP TABLE campaigns');
        $this->addSql('DROP TABLE gift_vouchers');
        $this->addSql('DROP TABLE reminder_rules');
        $this->addSql('DROP TABLE notification_logs');
    }
}

