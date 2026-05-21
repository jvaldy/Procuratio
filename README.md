# Procuratio

Socle Sprint 0 pret a cloner: backend Symfony securise, frontend React TypeScript, MySQL, OpenAPI, tests smoke.

## Stack

- Backend: Symfony 6.4 + JWT + OpenAPI (Nelmio)
- Frontend: React 18 + TypeScript + Vite
- Database: MySQL 8
- Tests: PHPUnit + Playwright

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

Acces developpement (`infra/docker-compose.yml`):

- Frontend: `http://localhost:43100`
- API: `http://localhost:48180`
- OpenAPI UI: `http://localhost:48180/api/doc`
- OpenAPI JSON: `http://localhost:48180/api/doc.json`
- Adminer: `http://localhost:48181`
- MySQL: `localhost:43306`

Acces production locale (`infra/docker-compose.prod.yml`):

- Frontend: `http://localhost:48200`
- API: `http://localhost:48280`
- OpenAPI UI: `http://localhost:48280/api/doc`
- OpenAPI JSON: `http://localhost:48280/api/doc.json`
- Adminer: `http://localhost:48281`

Depannage rapide doc API:

- Si `ERR_CONNECTION_REFUSED` sur `/api/doc`, verifier d'abord le bon port:
  - dev: `48180`
  - prod: `48280`
- Verifier l'etat des conteneurs:
  - `docker compose --env-file .env -f infra/docker-compose.yml ps`
  - `docker compose --env-file .env -f infra/docker-compose.prod.yml ps`

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
npx playwright install chromium
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

## Scenarios de verification manuelle (UI)

Objectif: valider les parcours utilisateur sans test automatise, en cliquant les boutons clefs.

Prerequis:

- Stack demarree (`infra/docker-compose.yml` ou `infra/docker-compose.prod.yml`)
- Frontend accessible
- Comptes de test disponibles (admin, employee, customer)

### Scenario 1 - Connexion et controle d'acces par role

1. Ouvrir la page de connexion.
2. Saisir `admin@procuratio.local` / `Admin123!`.
3. Cliquer `Se connecter`.
4. Verifier que les ecrans d'administration sont visibles (catalogue, CRM, stock).
5. Se deconnecter.
6. Refaire la connexion avec `customer@procuratio.local` / `Customer123!`.
7. Verifier que les ecrans admin ne sont pas proposes et que les pages client sont accessibles (catalogue, panier, commandes).

Resultat attendu:

- Aucun acces cross-role non autorise.
- Redirection correcte apres login.

### Scenario 2 - Gestion catalogue produit (admin)

1. Se connecter en admin.
2. Aller sur la page `Produits`.
3. Cliquer `Nouveau produit`.
4. Remplir les champs requis (nom, prix, stock initial, statut actif).
5. Cliquer `Enregistrer`.
6. Revenir a la liste et verifier la presence du produit.
7. Cliquer `Modifier` sur ce produit, changer un champ, puis `Enregistrer`.
8. Cliquer `Supprimer` et confirmer.

Resultat attendu:

- Creation, edition et suppression prises en compte immediatement en UI.
- Donnees coherentes apres rafraichissement de page.

### Scenario 3 - Ajustement de stock (admin/employee)

1. Se connecter en admin (ou employee si autorise).
2. Aller sur `Produits`, ouvrir la fiche d'un produit existant.
3. Cliquer `Ajuster le stock`.
4. Tester un mouvement `in` puis cliquer `Valider`.
5. Verifier que le stock augmente.
6. Refaire avec `out`, puis `Valider`.
7. Verifier que le stock diminue sans devenir negatif.
8. Refaire avec `adjust` vers une valeur cible.

Resultat attendu:

- Le stock affiche bien avant/apres chaque action.
- Une operation qui rend le stock negatif est refusee.

### Scenario 4 - Parcours client e-commerce + paiement

1. Se connecter en `customer`.
2. Aller sur le `Catalogue`.
3. Ouvrir une fiche produit puis cliquer `Ajouter au panier`.
4. Ouvrir la page `Panier`, ajuster la quantite, puis cliquer `Mettre a jour`.
5. Cliquer `Passer la commande` / `Payer`.
6. Finaliser le paiement (mode mock si `STRIPE_MOCK_MODE=1`).
7. Aller sur `Mes commandes`.
8. Ouvrir le detail de la commande.

Resultat attendu:

- Une commande est creee avec un numero unique.
- Le statut evolue vers `paid` si paiement confirme.
- Le stock est decremente uniquement apres confirmation paiement.

### Scenario 5 - Reservation produit (retrait magasin)

1. Se connecter en `customer`.
2. Depuis une fiche produit, cliquer `Reserver`.
3. Confirmer la reservation.
4. Aller sur `Mes reservations` et verifier le statut.
5. Se connecter en `employee`.
6. Ouvrir la reservation puis cliquer `Marquer comme retiree` (picked-up).

Resultat attendu:

- Reservation visible cote client.
- Changement de statut pris en compte apres action employee.

### Scenario 6 - Fidelite et bons cadeaux

1. Se connecter en `customer`.
2. Aller sur `Mon compte` / `Fidelite` et noter le solde de points.
3. Passer une commande payee.
4. Revenir sur la page fidelite et verifier le credit de points.
5. Se connecter en admin (ou role CRM).
6. Aller sur `Bons cadeaux`, ouvrir un bon, cliquer `Imprimer`.
7. Cliquer `Envoyer` pour l'envoi mail.

Resultat attendu:

- Les points sont debitables/creditables selon le checkout.
- Les actions imprimer/envoyer du bon cadeau fonctionnent sans erreur.

### Checklist de validation rapide

- Navigation: aucun bouton critique inactif sans raison.
- Messages UI: succes/erreur explicites apres chaque action.
- Securite: pages protegees inaccessibles sans authentification.
- Cohabitation roles: le meme compte ne voit que ses fonctionnalites.
