# Procuratio

Application web ERP/CRM pour instituts de beaute et salons de coiffure.  
Le projet couvre le back-office magasin, la caisse, le planning, le CRM, la fidelite, l'e-commerce, les bons cadeaux et l'espace client.

## Sommaire

- [Structure du projet](#structure-du-projet)
- [Roles des dossiers](#roles-des-dossiers)
- [Structure des applications](#structure-des-applications)
- [Stack technique](#stack-technique)
- [Versions verrouillees](#versions-verrouillees)
- [Prerequis](#prerequis)
- [Fichiers d'environnement](#fichiers-denvironnement)
- [Avant le premier lancement](#avant-le-premier-lancement)
- [Demarrage rapide](#demarrage-rapide)
- [Acces utiles](#acces-utiles)
- [Comptes de test](#comptes-de-test)
- [Fonctionnalites couvertes](#fonctionnalites-couvertes)
- [Endpoints utiles](#endpoints-utiles)
- [Regles metier importantes](#regles-metier-importantes)
- [Tests et verification](#tests-et-verification)
- [Commandes utiles](#commandes-utiles)
- [Documentation du projet](#documentation-du-projet)
- [Acces base de donnees](#acces-base-de-donnees)
- [Securite](#securite)
- [Depannage rapide](#depannage-rapide)
- [Problemes frequents et correctifs](#problemes-frequents-et-correctifs)

## Structure du projet

```text
Procuratio/
|-- api/
|-- frontend/
|-- docs/
|-- infra/
|-- scripts/
|-- .env
|-- .env.example
|-- .env.prod.example
|-- .gitignore
`-- README.md
```

## Roles des dossiers

- `api/` : application backend Symfony.
- `frontend/` : application frontend React.
- `docs/` : documentation technique et documents de cadrage.
- `infra/` : configuration Docker et fichiers de stack.
- `scripts/` : scripts utilitaires de bootstrap et de lancement.

## Structure des applications

### `api/`

```text
api/
|-- bin/
|-- config/
|-- public/
|-- src/
|   |-- Command/
|   |-- Controller/
|   |-- DataFixtures/
|   |-- Demo/
|   |-- Entity/
|   |-- EventSubscriber/
|   |-- Repository/
|   |-- Security/
|   `-- Service/
|-- tests/
`-- var/
```

Role des dossiers API :

- `Command` : commandes internes et outillage.
- `Controller` : endpoints HTTP et API.
- `DataFixtures` : jeux de donnees de demo et comptes de test.
- `Demo` : donnees catalogue et contenus de demonstration.
- `Entity` : entites Doctrine.
- `EventSubscriber` : gestion d'erreurs, securite et evenements applicatifs.
- `Repository` : acces a la base de donnees.
- `Security` : login, JWT, profils et gestion des acces.
- `Service` : logique metier.
- `tests` : tests backend PHPUnit.

### `frontend/`

```text
frontend/
|-- public/
|-- src/
|   |-- api/
|   |-- app/
|   |-- auth/
|   |-- hooks/
|   |-- layouts/
|   |-- pages/
|   |-- types/
|   |-- ui/
|   `-- utils/
`-- tests/
```

Role des dossiers frontend :

- `api` : appels HTTP vers le backend.
- `app` : routing et configuration d'application.
- `auth` : session, utilisateur courant et preferences.
- `hooks` : hooks React reutilisables.
- `layouts` : structures de page front-office et back-office.
- `pages` : ecrans fonctionnels.
- `types` : typage partage des payloads et reponses.
- `ui` : composants reutilisables.
- `utils` : formatage et helpers d'affichage.
- `tests` : tests Playwright.

## Stack technique

- Backend : Symfony 6.4
- Authentification : JWT
- Documentation API : OpenAPI / Nelmio
- Frontend : React 18, TypeScript, Vite
- Base de donnees : MySQL 8
- Paiement : Stripe
- Notifications : mail, webhook SMS, Brevo selon configuration
- Tests : PHPUnit et Playwright

## Versions verrouillees

Versions de reference figees pour garder un environnement stable jusqu'a la fin d'annee :

- Node.js : `20.20.2`
- npm : `10.8.2`
- PHP runtime Docker : `php:8.2-cli` verrouille par digest
- Composer build image : `composer:2.8` verrouille par digest
- Frontend build image : `node:20-bookworm-slim` verrouille par digest
- Frontend runtime image : `nginx:1.27-alpine` verrouille par digest
- MySQL : `mysql:8.0` verrouille par digest
- Adminer : `adminer:4` verrouille par digest
- Stripe CLI : `stripe/stripe-cli:latest` verrouille par digest

Points de verrouillage deja presents dans le depot :

- `frontend/package-lock.json`
- `api/composer.lock`
- `frontend/.npmrc`
- `.nvmrc`
- `.node-version`

## Prerequis

Pour lancer le projet sur une machine neuve :

- `Git`
- `Docker Desktop`
- `Docker Compose`
- un navigateur web recent

Outils utiles hors Docker :

- `Node.js` et `npm`
- `PHP`
- `Composer`

## Fichiers d'environnement

Fichiers d'exemple fournis :

- `.env.example`
- `.env.prod.example`
- `api/.env.example`
- `api/.env.test`
- `frontend/.env.example`

Source de verite de l'environnement :

- `.env` a la racine pour l'execution locale courante
- `.env.prod` pour la stack prod locale si vous utilisez la variante production

## Avant le premier lancement

1. Copier `.env.example` vers `.env` si ce n'est pas deja fait.
2. Renseigner les variables sensibles et techniques attendues.
3. Verifier au minimum :
   - la configuration MySQL
   - les secrets JWT
   - les cles Stripe si le paiement doit etre teste
   - la configuration notifications si les emails ou SMS doivent etre utilises

Variables importantes cote backend :

- `APP_SECRET`
- `JWT_PASSPHRASE`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_MOCK_MODE`
- `NOTIFICATIONS_EMAIL_MODE`
- `NOTIFICATIONS_SMS_MODE`
- `NOTIFICATIONS_MAIL_FROM`
- `NOTIFICATIONS_MAIL_REPLY_TO`
- `BREVO_API_KEY`
- `SMS_SENDER`
- `SMS_WEBHOOK_URL`
- `SMS_WEBHOOK_TOKEN`

## Demarrage rapide

### Version developpement

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

### Version prod locale

1. Copier `.env.prod.example` vers `.env.prod`
2. Renseigner les valeurs de production locale
3. Lancer :

```bash
docker compose --env-file .env.prod -f infra/docker-compose.prod.yml up -d --build
```

### Scripts disponibles

```bash
# Linux/macOS
sh scripts/bootstrap-env.sh
sh scripts/stack-prod-up.sh
sh scripts/stack-prod-down.sh

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts/bootstrap-env.ps1
powershell -ExecutionPolicy Bypass -File scripts/stack-prod-up.ps1
powershell -ExecutionPolicy Bypass -File scripts/stack-prod-down.ps1
```

## Acces utiles

### Environnement developpement

- Frontend : `http://localhost:43100`
- API : `http://localhost:48180`
- OpenAPI UI : `http://localhost:48180/api/doc`
- OpenAPI JSON : `http://localhost:48180/api/doc.json`
- Adminer : `http://localhost:48181`
- MySQL : `localhost:43306`

### Environnement prod locale

- Frontend : `http://localhost:48200`
- API : `http://localhost:48280`
- OpenAPI UI : `http://localhost:48280/api/doc`
- OpenAPI JSON : `http://localhost:48280/api/doc.json`
- Adminer : `http://localhost:48281`

## Comptes de test

- `admin@procuratio.local` / `Admin123!`
- `employee@procuratio.local` / `Employee123!`
- `customer@procuratio.local` / `Customer123!`

## Fonctionnalites couvertes

- Gestion produits et services
- Gestion de stock et ajustements
- Caisse / POS
- Planning et rendez-vous
- Fiches clients
- Fidelite :
  - points
  - abonnements
  - cartes de visites
- CRM :
  - campagnes
  - rappels
  - bons cadeaux
- E-commerce
- Reservation produit
- Profil client et profil back-office
- Warehouse / fulfillment
- Paiement Stripe

## Endpoints utiles

### Endpoints de base

- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `GET /api/v1/me`
- `GET /api/v1/admin/ping`

### Catalogue et stock

- `GET /api/v1/products`
- `POST /api/v1/products`
- `PUT /api/v1/products/{id}`
- `DELETE /api/v1/products/{id}`
- `POST /api/v1/products/{id}/stock-adjustments`
- `GET /api/v1/services`
- `POST /api/v1/services`
- `PUT /api/v1/services/{id}`
- `DELETE /api/v1/services/{id}`
- `GET /api/v1/catalog/brands`
- `GET /api/v1/catalog/categories`

### E-commerce

- `GET /api/v1/catalog/products`
- `GET /api/v1/catalog/products/{id}`
- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PUT /api/v1/cart/items/{productId}`
- `DELETE /api/v1/cart/items/{productId}`
- `POST /api/v1/checkout`
- `GET /api/v1/orders/me`
- `GET /api/v1/orders/{orderNumber}`
- `POST /api/v1/payments/stripe/webhook`

### Fidelite et bons cadeaux

- `GET /api/v1/loyalty/me`
- `GET /api/v1/crm/gift-vouchers/{id}/print`
- `POST /api/v1/crm/gift-vouchers/{id}/send`

### Reservation produit

- `POST /api/v1/catalog/products/{id}/reservations`
- `GET /api/v1/reservations/me`
- `POST /api/v1/reservations/{id}/cancel`
- `POST /api/v1/reservations/{id}/picked-up`

## Regles metier importantes

### Stock

- mouvements supportes : `in`, `out`, `adjust`
- le stock negatif est bloque
- chaque ajustement laisse une trace dans `stock_movements`

### Paiement et commandes

- le stock n'est decremente qu'apres confirmation de paiement valide
- le webhook Stripe est idempotent
- les evenements paiement sont journalises

### Fidelite

- les points peuvent etre credites ou consommes
- les cartes de visites s'incrementent quand un rendez-vous passe en `completed`
- une carte de visites se desactive automatiquement quand le quota est atteint

### Bons cadeaux

- impression possible
- envoi possible selon la configuration notifications
- affichage cote client si le bon est lie au compte ou a l'email du client

## Tests et verification

### Backend

```bash
cd api
php bin/phpunit
```

### Frontend

```bash
cd frontend
npm run build
npx playwright install chromium
npx playwright test
```

### Verification manuelle rapide

Parcours utiles a verifier :

1. login admin, employee, customer
2. creation et edition produit
3. ajustement de stock
4. vente POS
5. creation de rendez-vous
6. commande e-commerce
7. consultation profil client
8. actions CRM et bons cadeaux

## Commandes utiles

### Stack developpement

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
docker compose --env-file .env -f infra/docker-compose.yml down
docker compose --env-file .env -f infra/docker-compose.yml ps
docker compose --env-file .env -f infra/docker-compose.yml logs -f api
docker compose --env-file .env -f infra/docker-compose.yml logs -f frontend
```

### Stack prod locale

```bash
docker compose --env-file .env -f infra/docker-compose.prod.yml up -d --build
docker compose --env-file .env -f infra/docker-compose.prod.yml down
docker compose --env-file .env -f infra/docker-compose.prod.yml ps
docker compose --env-file .env -f infra/docker-compose.prod.yml logs -f api
docker compose --env-file .env -f infra/docker-compose.prod.yml logs -f frontend
```

### Frontend

```bash
cd frontend
npm ci
npm run build
npx playwright test
```

### Backend

```bash
cd api
php bin/phpunit
php bin/console cache:clear
php bin/console doctrine:migrations:migrate --no-interaction
```

### Conteneurs utiles

```bash
docker exec procuratio-api-prod php bin/phpunit
docker exec procuratio-api-prod php bin/console doctrine:migrations:migrate --no-interaction
docker exec procuratio-api-prod php bin/console cache:clear
docker exec procuratio-api-prod php bin/console app:cleanup-e2e-data --no-interaction
```

### Verification rapide des versions locales

```bash
node -v
npm -v
docker --version
docker compose version
php -v
composer --version
```

## Documentation du projet

- Documentation technique : [docs/TECHNICAL_DOCUMENTATION.docx](d:/projets/Procuratio/app/docs/TECHNICAL_DOCUMENTATION.docx)
- Guide utilisateur : [docs/USER_GUIDE.docx](d:/projets/Procuratio/app/docs/USER_GUIDE.docx)
- Source du guide utilisateur : [docs/USER_GUIDE.md](d:/projets/Procuratio/app/docs/USER_GUIDE.md)
- Architecture : [docs/ARCHITECTURE.md](d:/projets/Procuratio/app/docs/ARCHITECTURE.md)
- Plan et cadrage : [docs/SPRINT_PLAN.md](d:/projets/Procuratio/app/docs/SPRINT_PLAN.md)

## Acces base de donnees

Une interface Adminer est disponible dans les stacks Docker :

- dev : `http://localhost:48181`
- prod locale : `http://localhost:48281`

Utiliser les identifiants definis dans vos fichiers `.env` ou `.env.prod`.

## Securite

- les fichiers `.env` locaux ne doivent pas etre versionnes
- les fichiers `*.example` servent uniquement de modele
- les secrets applicatifs doivent rester hors du depot
- les comptes de test fournis ici sont destines a un environnement local de demonstration

## Depannage rapide

Si la documentation API ne repond pas :

- verifier le bon port :
  - dev : `48180`
  - prod locale : `48280`
- verifier l'etat des conteneurs :

```bash
docker compose --env-file .env -f infra/docker-compose.yml ps
docker compose --env-file .env -f infra/docker-compose.prod.yml ps
```

Si une stack doit etre arretee :

```bash
docker compose --env-file .env -f infra/docker-compose.yml down
docker compose --env-file .env.prod -f infra/docker-compose.prod.yml down
```

## Problemes frequents et correctifs

Cette section sert de guide rapide si le projet ne demarre pas, si le build echoue ou si votre machine a des versions plus recentes que celles attendues par Procuratio.

### 1. Docker Desktop n'est pas lance

Symptomes possibles :

- `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`
- `Cannot connect to the Docker daemon`
- les commandes `docker compose` echouent immediatement

Correctif :

1. lancer Docker Desktop
2. attendre que le moteur Linux soit pret
3. relancer la stack

Commande utile :

```bash
docker compose --env-file .env -f infra/docker-compose.prod.yml up -d --build
```

### 2. Les ports du projet sont deja pris

Symptomes possibles :

- le frontend ne demarre pas
- Adminer ou l'API est inaccessible
- message de type `port is already allocated`

Ports utilises par le projet :

- dev :
  - `43100`
  - `48180`
  - `48181`
  - `43306`
- prod locale :
  - `48200`
  - `48280`
  - `48281`

Correctif :

1. arreter l'autre service qui utilise deja le port
2. ou changer les variables de port dans `.env` si necessaire

### 3. Node.js ou npm plus recents que la version attendue

Le projet est verrouille pour :

- Node.js `20.20.2`
- npm `10.8.2`

Symptomes possibles si votre machine utilise une version plus avancee :

- warning `Unsupported engine`
- comportement different entre votre machine et Docker
- lockfile modifie sans raison
- installation ou build qui diverge

Correctif recommande :

1. utiliser la version de reference du projet
2. si vous utilisez `nvm`, lancer :

```bash
nvm use
```

3. sinon installer la bonne version de Node localement
4. verifier ensuite :

```bash
node -v
npm -v
```

Fichiers de reference :

- `.nvmrc`
- `.node-version`
- `frontend/.npmrc`

Important :

- si votre machine a une version plus recente, preferer le build Docker
- eviter `npm install` si ce n'est pas necessaire
- preferer `npm ci` pour respecter le lockfile

### 4. Le lockfile frontend n'est plus en phase avec `package.json`

Symptomes possibles :

- `npm ci can only install packages when your package.json and package-lock.json are in sync`
- echec de build dans le conteneur frontend

Correctif :

1. ne pas modifier les versions a la main sans mettre a jour le lockfile
2. si une vraie mise a jour est voulue, faire l'operation proprement sur la meme version Node/npm que le projet
3. sinon revenir a l'etat verrouille du depot

### 5. Composer ou PHP local plus recents que le runtime Docker

Le runtime du projet est base sur `php:8.2-cli`.

Symptomes possibles :

- comportements differents entre local et Docker
- dependances resolues differemment
- erreurs absentes en Docker mais presentes en local, ou l'inverse

Correctif :

- privilegier Docker pour l'execution de reference
- garder `composer.lock` intact
- si vous utilisez PHP localement, rester sur un environnement compatible PHP 8.2

### 6. Variables d'environnement manquantes

Symptomes possibles :

- le backend ne demarre pas
- le conteneur `api` boucle au lancement
- Stripe, email ou SMS ne fonctionnent pas

Variables souvent en cause :

- `DATABASE_URL`
- `APP_SECRET`
- `JWT_PASSPHRASE`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NOTIFICATIONS_MAIL_FROM`
- `CORS_ALLOW_ORIGIN`

Correctif :

1. repartir de `.env.example` ou `.env.prod.example`
2. verifier les variables obligatoires
3. relancer la stack

### 7. L'API doc ne repond pas

Symptomes possibles :

- `ERR_CONNECTION_REFUSED`
- page blanche sur `/api/doc`

Correctif :

1. verifier que vous utilisez le bon port
2. verifier que la stack est bien demarree
3. verifier la sante du backend

Commandes utiles :

```bash
docker compose --env-file .env -f infra/docker-compose.yml ps
docker compose --env-file .env -f infra/docker-compose.prod.yml ps
```

### 8. Les emails ou SMS ne partent pas

Symptomes possibles :

- l'action semble marcher en UI mais aucun message n'arrive
- le mot de passe temporaire est genere mais non recu

Pistes a verifier :

- mode notifications configure dans `.env`
- cle Brevo valide
- credits Brevo disponibles
- expéditeur ou domaine autorise chez le provider
- webhook SMS joignable

Important :

- le projet peut etre correctement configure techniquement
- mais un provider externe peut quand meme refuser ou bloquer la livraison

### 9. Des donnees de test apparaissent dans l'interface

Symptomes possibles :

- boutiques `E2E ...`
- clients ou campagnes techniques
- produits de test encore visibles

Correctif :

- les tests E2E recents nettoient leurs donnees automatiquement
- si un ancien reliquat persiste, utiliser la commande de nettoyage adaptee
- garder en tete que certaines donnees de test deja liees a de l'historique ne doivent pas etre supprimees brutalement

### 10. Le frontend build mais affiche un warning sur la taille des chunks

Symptome :

- warning Vite sur les chunks de plus de `500 kB`

Ce que cela veut dire :

- ce n'est pas un echec de build
- le projet fonctionne quand meme
- c'est un sujet d'optimisation, pas un blocage de lancement

### 11. Comment patcher proprement un poste trop avance

Si votre machine est plus recente que le projet :

1. verifier d'abord les versions avec :

```bash
node -v
npm -v
docker --version
docker compose version
```

2. realigner Node/npm sur :
   - Node `20.20.2`
   - npm `10.8.2`
3. ne pas mettre a jour les dependances "pour faire propre" sans besoin reel
4. conserver :
   - `frontend/package-lock.json`
   - `api/composer.lock`
5. preferer les builds Docker si un doute persiste

### 12. Bon reflexe si quelque chose diverge

Avant de patcher dans l'urgence :

1. verifier les versions locales
2. comparer avec les versions verrouillees du projet
3. verifier les variables d'environnement
4. rebuild la stack
5. seulement ensuite investiguer le code

Dans ce projet, beaucoup de problemes de lancement viennent d'un decalage d'environnement, pas d'une regression fonctionnelle.
