<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260504000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Planning: add global business hours for salon opening and closing rules';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE business_hours (id INT AUTO_INCREMENT NOT NULL, day_of_week INT NOT NULL, start_time TIME NOT NULL COMMENT '(DC2Type:time_immutable)', end_time TIME NOT NULL COMMENT '(DC2Type:time_immutable)', is_open TINYINT(1) NOT NULL, UNIQUE INDEX uniq_business_hours_day (day_of_week), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql("INSERT INTO business_hours (day_of_week, start_time, end_time, is_open) VALUES
            (1, '09:00:00', '18:00:00', 1),
            (2, '09:00:00', '18:00:00', 1),
            (3, '09:00:00', '18:00:00', 1),
            (4, '09:00:00', '18:00:00', 1),
            (5, '09:00:00', '18:00:00', 1),
            (6, '09:00:00', '18:00:00', 1),
            (7, '09:00:00', '18:00:00', 0)");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE business_hours');
    }
}
