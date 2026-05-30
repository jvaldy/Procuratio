FROM php:8.2-cli@sha256:4a03865a30b1b8f9d8f52704719676047b2bcdb05188e01f0085447ecb14bef3

RUN apt-get update && apt-get install -y git unzip default-mysql-client libicu-dev libzip-dev libonig-dev libxml2-dev && docker-php-ext-install pdo pdo_mysql
COPY --from=composer:2.8@sha256:5248900ab8b5f7f880c2d62180e40960cd87f60149ec9a1abfd62ac72a02577c /usr/bin/composer /usr/bin/composer
WORKDIR /app
