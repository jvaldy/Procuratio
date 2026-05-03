#!/usr/bin/env sh
set -eu

export APP_ENV=prod

if [ ! -d vendor ]; then
  composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader
fi

: "${DATABASE_URL:?Missing DATABASE_URL}"
: "${JWT_PASSPHRASE:?Missing JWT_PASSPHRASE}"
: "${MYSQL_DATABASE:?Missing MYSQL_DATABASE}"
: "${MYSQL_USER:?Missing MYSQL_USER}"
: "${MYSQL_PASSWORD:?Missing MYSQL_PASSWORD}"
: "${MYSQL_ROOT_PASSWORD:?Missing MYSQL_ROOT_PASSWORD}"

DB_HOST="${DB_HOST:-db}"
tries=0
until mysqladmin ping --skip-ssl -h "${DB_HOST}" -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" --silent; do
  tries=$((tries + 1))
  if [ "$tries" -ge 40 ]; then
    echo "MySQL not ready after retries" >&2
    exit 1
  fi
  sleep 2
done

if [ ! -f config/jwt/private.pem ] || [ ! -f config/jwt/public.pem ]; then
  php bin/console lexik:jwt:generate-keypair --no-interaction
fi

php bin/console doctrine:migrations:migrate --no-interaction
php bin/console cache:clear --no-warmup
php bin/console cache:warmup

exec php -d variables_order=EGPCS -S 0.0.0.0:8080 -t public public/index.php
