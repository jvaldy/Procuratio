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
- `.env.prod.example` (production)

Source de verite des variables:

- `.env` (racine) contient les variables sensibles et communes.
- Aucun fichier `.env` duplique n'est necessaire pour l'execution courante.

## Lancement Docker (ports peu communs)

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

## Lancement Production

```bash
# 1) preparer le fichier de secrets prod
cp .env.prod.example .env.prod

# 2) demarrer la stack prod
docker compose --env-file .env.prod -f infra/docker-compose.prod.yml up -d --build
```

Ou via scripts:

```bash
# Linux/macOS
sh scripts/stack-prod-up.sh

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts/stack-prod-up.ps1
```

Arret production:

```bash
docker compose --env-file .env.prod -f infra/docker-compose.prod.yml down
```

Ou via scripts:

```bash
# Linux/macOS
sh scripts/stack-prod-down.sh

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts/stack-prod-down.ps1
```

Acces:

- Frontend: http://localhost:23000
- API: http://localhost:18080
- OpenAPI UI: http://localhost:18080/api/doc
- OpenAPI JSON: http://localhost:18080/api/doc.json
- Adminer: http://localhost:18081
- MySQL: localhost:23306

Acces production par defaut:

- Frontend: `http://localhost:28000`
- API: `http://localhost:28080`

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

- `.env` racine comme source centrale
- `api/.env.test` pour tests

L'API attend la disponibilite MySQL avant d'executer les migrations/fixtures.

## Tests

```bash
cd api
php bin/phpunit
```

```bash
cd frontend
npm run build
npm run test:e2e:pos
```

Variables paiement (backend):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_MOCK_MODE` (`1` en local pour mocker PaymentIntent)

Variables notifications (backend):

- `NOTIFICATIONS_EMAIL_MODE` (`log` ou `mail`)
- `NOTIFICATIONS_SMS_MODE` (`log`, `webhook` ou `brevo`)
- `NOTIFICATIONS_MAIL_FROM`
- `NOTIFICATIONS_MAIL_REPLY_TO`
- `BREVO_API_KEY`
- `SMS_SENDER`
- `SMS_WEBHOOK_URL`
- `SMS_WEBHOOK_TOKEN`

Exemples d'usage SMS:

- `NOTIFICATIONS_SMS_MODE=log`
  - aucun envoi reel, utile en dev et en tests.
- `NOTIFICATIONS_SMS_MODE=brevo`
  - utilise l'API transactionnelle Brevo avec `BREVO_API_KEY` et `SMS_SENDER`.
- `NOTIFICATIONS_SMS_MODE=webhook`
  - poste le payload `{ to, message, sender }` sur `SMS_WEBHOOK_URL`
  - ajoute `Authorization: Bearer <SMS_WEBHOOK_TOKEN>` si un token est configure.


## Sprint 1 - Operations stock/services

### Regles metier stock

- Mouvements supportes: `in`, `out`, `adjust`.
- `in`: ajoute `quantity` au stock courant.
- `out`: retire `quantity` du stock courant.
- `adjust`: fixe le stock a `quantity` (valeur cible).
- Stock negatif bloque par configuration backend.
- Chaque ajustement cree une trace dans `stock_movements` avec type, raison, commentaire, stock avant/apres.

### API principale

- `GET /api/v1/products` filtres + tri + pagination
- `POST /api/v1/products`
- `PUT /api/v1/products/{id}`
- `DELETE /api/v1/products/{id}`
- `POST /api/v1/products/{id}/stock-adjustments`
- `GET /api/v1/services` filtres + tri + pagination
- `POST /api/v1/services`
- `PUT /api/v1/services/{id}`
- `DELETE /api/v1/services/{id}`
- `GET /api/v1/catalog/brands`
- `GET /api/v1/catalog/categories`

### Exemples filtres/tri/pagination

- Produits par nom: `/api/v1/products?name=shampoo`
- Produits actifs tries par stock: `/api/v1/products?active=true&sort=stock&order=DESC&page=1&perPage=20`
- Services par plage de prix: `/api/v1/services?minPrice=20&maxPrice=50&sort=price&order=ASC`

## Sprint 4 - E-commerce + Paiement securise

### API e-commerce

- `GET /api/v1/catalog/products` (public)
- `GET /api/v1/catalog/products/{id}` (public)
- `GET /api/v1/cart` (ROLE_CUSTOMER)
- `POST /api/v1/cart/items` (ROLE_CUSTOMER)
- `PUT /api/v1/cart/items/{productId}` (ROLE_CUSTOMER)
- `DELETE /api/v1/cart/items/{productId}` (ROLE_CUSTOMER)
- `POST /api/v1/checkout` (ROLE_CUSTOMER)
- `GET /api/v1/orders/me` (ROLE_CUSTOMER)
- `GET /api/v1/orders/{orderNumber}` (ROLE_CUSTOMER)
- `POST /api/v1/payments/stripe/webhook` (public + verification signature)

### Statuts commande

- `pending`: commande creee, en attente du resultat paiement.
- `paid`: paiement confirme, commande reglee.
- `failed`: paiement echoue ou incident de stock.
- `cancelled`: commande annulee.
- `ready_for_pickup`: paiement confirme et commande preparee pour retrait magasin.

### Regles de synchro stock/paiement

- Le stock n'est decremente qu'apres reception d'un evenement `payment_intent.succeeded` valide.
- Le webhook Stripe est idempotent via unicite `payment_events.provider_event_id`.
- Les evenements paiement sont journalises dans `payment_events` pour audit/diagnostic.

## Gap closure - Enonce complet

Fonctionnalites ajoutees pour couvrir les points restants de l'enonce:

- Reservation produit limitee dans le temps (retrait magasin):
  - `POST /api/v1/catalog/products/{id}/reservations` (client)
  - `GET /api/v1/reservations/me` (client)
  - `POST /api/v1/reservations/{id}/cancel` (client)
  - `POST /api/v1/reservations/{id}/picked-up` (employee)
- Fidelite utilisable sur le web:
  - `GET /api/v1/loyalty/me`
  - `POST /api/v1/checkout` accepte `redeemPoints`
  - credit points automatique apres paiement confirme.
- Bons cadeaux imprimables + envoi mail:
  - `GET /api/v1/crm/gift-vouchers/{id}/print`
  - `POST /api/v1/crm/gift-vouchers/{id}/send`
- Envois campagnes/rappels/offres anniversaire:
  - en mode reel configurable (`mail` / webhook SMS),
  - journalisation systematique dans `notification_logs`.
