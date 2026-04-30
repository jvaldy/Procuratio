#!/usr/bin/env sh
set -eu

# On n'installe les deps que si le dossier vendor est absent.
# En dev, cela evite des redemarrages tres lents et des "Failed to fetch" transitoires.
if [ ! -d vendor ]; then
  composer install --no-interaction
fi

# DB_HOST peut garder un fallback local car ce n'est pas une donnee sensible.
DB_HOST="${DB_HOST:-db}"
MYSQL_DATABASE="${MYSQL_DATABASE:-}"
MYSQL_USER="${MYSQL_USER:-}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-}"

# On echoue vite si une variable sensible manque, pour eviter un demarrage "magique" avec des secrets implicites.
: "${MYSQL_DATABASE:?Missing MYSQL_DATABASE}"
: "${MYSQL_USER:?Missing MYSQL_USER}"
: "${MYSQL_PASSWORD:?Missing MYSQL_PASSWORD}"
: "${MYSQL_ROOT_PASSWORD:?Missing MYSQL_ROOT_PASSWORD}"

# On attend MySQL avant migrations pour eviter les echecs aleatoires au demarrage.
tries=0
until mysqladmin ping --skip-ssl -h "${DB_HOST}" -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" --silent; do
  tries=$((tries + 1))
  if [ "$tries" -ge 30 ]; then
    echo "MySQL not ready after retries" >&2
    exit 1
  fi
  echo "Waiting DB..."
  sleep 2
done

echo "DB ready"

# En dev on regenere les cles a chaque boot pour garder la coherence avec JWT_PASSPHRASE
# et eviter les erreurs 500 si les fichiers existent avec une ancienne passphrase.
php bin/console lexik:jwt:generate-keypair --overwrite --no-interaction
# On cree explicitement la base avant Doctrine pour eviter les erreurs de connexion
# quand l'URL cible une base encore absente.
mysql --skip-ssl -h "${DB_HOST}" -uroot -p"${MYSQL_ROOT_PASSWORD}" -e "CREATE DATABASE IF NOT EXISTS ${MYSQL_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
php bin/console doctrine:migrations:migrate --no-interaction
php bin/console doctrine:fixtures:load --no-interaction
exec php -S 0.0.0.0:8080 -t public public/index.php
