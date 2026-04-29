# Procuratio

Socle Sprint 0 pret a cloner: backend Symfony securise, frontend React TypeScript, MySQL, OpenAPI, tests smoke.

## Stack

- Backend: Symfony 6.4 + JWT + OpenAPI (Nelmio)
- Frontend: React 18 + TypeScript + Vite
- Database: MySQL 8
- Tests: PHPUnit + Cypress

## Structure

- `api/`
- `frontend/`
- `infra/`
- `scripts/`

## Bootstrap apres clone

```bash
# Linux/macOS
sh scripts/bootstrap-env.sh

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts/bootstrap-env.ps1
```

Fichiers d'exemple fournis:

- `api/.env.example`
- `frontend/.env.example`
- `.env.example` (racine)

## Lancement Docker (ports peu communs)

```bash
cd infra
docker compose up -d --build
```

Acces:

- Frontend: http://localhost:23000
- API: http://localhost:18080
- OpenAPI UI: http://localhost:18080/api/doc
- OpenAPI JSON: http://localhost:18080/api/doc.json`r`n- Adminer: http://localhost:18081`r`n- MySQL: localhost:23306

## Comptes de test

- `admin@procuratio.local` / `Admin123!`
- `employee@procuratio.local` / `Employee123!`
- `customer@procuratio.local` / `Customer123!`

## Endpoints Sprint 0

- `GET /api/v1/health` (public)
- `POST /api/v1/auth/login` (public)
- `GET /api/v1/me` (JWT requis)
- `GET /api/v1/admin/ping` (ROLE_ADMIN)

## SQL / migrations

Configuration SQL unifiee en MySQL:

- `api/.env` pour dev local
- `api/.env.test` pour tests
- `infra/docker-compose.yml` pour conteneurs

L'API attend la disponibilite MySQL avant d'executer les migrations/fixtures.

## Tests

```bash
cd api
php bin/phpunit
```

