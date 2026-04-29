<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260429000200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add refresh_tokens table for server-managed refresh token flow';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE refresh_tokens (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, token_hash VARCHAR(64) NOT NULL, expires_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', revoked_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)', UNIQUE INDEX UNIQ_9BACE7E6BE8502CA (token_hash), INDEX IDX_9BACE7E6A76ED395 (user_id), INDEX idx_refresh_token_hash (token_hash), INDEX idx_refresh_token_expires_at (expires_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql('ALTER TABLE refresh_tokens ADD CONSTRAINT FK_9BACE7E6A76ED395 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE refresh_tokens DROP FOREIGN KEY FK_9BACE7E6A76ED395');
        $this->addSql('DROP TABLE refresh_tokens');
    }
}

