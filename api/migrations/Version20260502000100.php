<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260502000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Sprint 5 booking client: booking_sessions, appointment_status_history, colonnes booking dans appointments';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE appointments ADD booking_source VARCHAR(20) NOT NULL DEFAULT 'internal', ADD payment_mode VARCHAR(20) DEFAULT NULL, ADD payment_status VARCHAR(20) DEFAULT NULL");
        $this->addSql('CREATE INDEX idx_appointments_customer_status_start ON appointments (customer_id, status, start_at)');

        $this->addSql("CREATE TABLE appointment_status_history (id INT AUTO_INCREMENT NOT NULL, appointment_id INT NOT NULL, customer_id INT DEFAULT NULL, from_status VARCHAR(20) DEFAULT NULL, to_status VARCHAR(20) NOT NULL, changed_by VARCHAR(20) NOT NULL, reason LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX IDX_C473F4F1758A6656 (appointment_id), INDEX IDX_C473F4F1395C3F3 (customer_id), INDEX idx_appointment_history_appointment (appointment_id, created_at), INDEX idx_appointment_history_customer (customer_id, created_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE booking_sessions (id INT AUTO_INCREMENT NOT NULL, customer_id INT NOT NULL, employee_id INT NOT NULL, service_id INT NOT NULL, appointment_id INT DEFAULT NULL, session_token VARCHAR(50) NOT NULL, status VARCHAR(20) NOT NULL, start_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', end_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', payment_mode VARCHAR(20) NOT NULL, payment_status VARCHAR(20) NOT NULL, expires_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', UNIQUE INDEX UNIQ_3E74C880AF0C5A6 (session_token), INDEX IDX_3E74C880395C3F3 (customer_id), INDEX IDX_3E74C8808C03F15C (employee_id), INDEX IDX_3E74C880ED5CA9E6 (service_id), INDEX IDX_3E74C880758A6656 (appointment_id), INDEX idx_booking_sessions_customer_status_start (customer_id, status, start_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");

        $this->addSql('ALTER TABLE appointment_status_history ADD CONSTRAINT FK_C473F4F1758A6656 FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE appointment_status_history ADD CONSTRAINT FK_C473F4F1395C3F3 FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE booking_sessions ADD CONSTRAINT FK_3E74C880395C3F3 FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE booking_sessions ADD CONSTRAINT FK_3E74C8808C03F15C FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE RESTRICT');
        $this->addSql('ALTER TABLE booking_sessions ADD CONSTRAINT FK_3E74C880ED5CA9E6 FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE RESTRICT');
        $this->addSql('ALTER TABLE booking_sessions ADD CONSTRAINT FK_3E74C880758A6656 FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE appointment_status_history DROP FOREIGN KEY FK_C473F4F1758A6656');
        $this->addSql('ALTER TABLE appointment_status_history DROP FOREIGN KEY FK_C473F4F1395C3F3');
        $this->addSql('ALTER TABLE booking_sessions DROP FOREIGN KEY FK_3E74C880395C3F3');
        $this->addSql('ALTER TABLE booking_sessions DROP FOREIGN KEY FK_3E74C8808C03F15C');
        $this->addSql('ALTER TABLE booking_sessions DROP FOREIGN KEY FK_3E74C880ED5CA9E6');
        $this->addSql('ALTER TABLE booking_sessions DROP FOREIGN KEY FK_3E74C880758A6656');
        $this->addSql('DROP TABLE appointment_status_history');
        $this->addSql('DROP TABLE booking_sessions');
        $this->addSql('DROP INDEX idx_appointments_customer_status_start ON appointments');
        $this->addSql('ALTER TABLE appointments DROP booking_source, DROP payment_mode, DROP payment_status');
    }
}

