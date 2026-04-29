#!/usr/bin/env sh
set -eu

# On n'installe les deps que si le dossier vendor est absent.
# En dev, cela evite des redemarrages tres lents et des "Failed to fetch" transitoires.
if [ ! -d vendor ]; then
  composer install --no-interaction
fi

# Compose injecte ces variables; on garde des fallback dev pour eviter les plantages.
DB_HOST="${DB_HOST:-db}"
MYSQL_DATABASE="${MYSQL_DATABASE:-procuratio}"
MYSQL_USER="${MYSQL_USER:-app}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-app}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root}"

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

# Les cles JWT ne sont pas versionnees : on les genere au premier boot.
php bin/console lexik:jwt:generate-keypair --skip-if-exists
# On cree explicitement la base avant Doctrine pour eviter les erreurs de connexion
# quand l'URL cible une base encore absente.
mysql --skip-ssl -h "${DB_HOST}" -uroot -p"${MYSQL_ROOT_PASSWORD}" -e "CREATE DATABASE IF NOT EXISTS ${MYSQL_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
php bin/console doctrine:migrations:migrate --no-interaction
php bin/console doctrine:fixtures:load --no-interaction
exec php -S 0.0.0.0:8080 -t public public/index.php
