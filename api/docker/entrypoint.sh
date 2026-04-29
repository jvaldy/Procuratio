#!/usr/bin/env sh
set -eu

composer install

# Wait for MySQL before running migrations to avoid random boot failures
# depending on container startup order.
php -r '
 = 0;
while ( < 30) {
    try {
        new PDO("mysql:host=db;port=3306;dbname=procuratio", "app", "app");
        echo "DB ready\\n";
        exit(0);
    } catch (Exception ) {
        ++;
        echo "Waiting DB...\\n";
        sleep(2);
    }
}
exit(1);
'

# JWT keys are intentionally not versioned; generate them on first boot.
php bin/console lexik:jwt:generate-keypair --skip-if-exists
php bin/console doctrine:migrations:migrate --no-interaction
php bin/console doctrine:fixtures:load --no-interaction
php -S 0.0.0.0:8080 -t public