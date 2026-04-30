<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260430000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Sprint 3 planning: appointments, appointment services, employee availability';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE services ADD duration_minutes INT NOT NULL DEFAULT 45');

        $this->addSql("CREATE TABLE appointments (id INT AUTO_INCREMENT NOT NULL, employee_id INT NOT NULL, customer_id INT DEFAULT NULL, status VARCHAR(20) NOT NULL, start_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', end_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', notes LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX IDX_6DFBD9A88C03F15C (employee_id), INDEX IDX_6DFBD9A89395C3F3 (customer_id), INDEX idx_appointments_employee_slot (employee_id, start_at, end_at), INDEX idx_appointments_status (status), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE appointment_services (id INT AUTO_INCREMENT NOT NULL, appointment_id INT NOT NULL, service_id INT NOT NULL, quantity INT NOT NULL, duration_minutes INT NOT NULL, INDEX IDX_FA73A307758A6656 (appointment_id), INDEX IDX_FA73A307ED5CA9E6 (service_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("CREATE TABLE employee_availability (id INT AUTO_INCREMENT NOT NULL, employee_id INT NOT NULL, day_of_week INT NOT NULL, start_time TIME NOT NULL COMMENT '(DC2Type:time_immutable)', end_time TIME NOT NULL COMMENT '(DC2Type:time_immutable)', is_available TINYINT(1) NOT NULL, INDEX IDX_871D26D48C03F15C (employee_id), INDEX idx_availability_employee_day (employee_id, day_of_week), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");

        $this->addSql('ALTER TABLE appointments ADD CONSTRAINT FK_6DFBD9A88C03F15C FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE appointments ADD CONSTRAINT FK_6DFBD9A89395C3F3 FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE appointment_services ADD CONSTRAINT FK_FA73A307758A6656 FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE appointment_services ADD CONSTRAINT FK_FA73A307ED5CA9E6 FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE RESTRICT');
        $this->addSql('ALTER TABLE employee_availability ADD CONSTRAINT FK_871D26D48C03F15C FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE appointments DROP FOREIGN KEY FK_6DFBD9A88C03F15C');
        $this->addSql('ALTER TABLE appointments DROP FOREIGN KEY FK_6DFBD9A89395C3F3');
        $this->addSql('ALTER TABLE appointment_services DROP FOREIGN KEY FK_FA73A307758A6656');
        $this->addSql('ALTER TABLE appointment_services DROP FOREIGN KEY FK_FA73A307ED5CA9E6');
        $this->addSql('ALTER TABLE employee_availability DROP FOREIGN KEY FK_871D26D48C03F15C');
        $this->addSql('DROP TABLE appointments');
        $this->addSql('DROP TABLE appointment_services');
        $this->addSql('DROP TABLE employee_availability');
        $this->addSql('ALTER TABLE services DROP duration_minutes');
    }
}

