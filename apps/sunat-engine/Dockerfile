FROM php:8.3-apache

RUN apt-get update \
 && apt-get install -y --no-install-recommends libxml2-dev libzip-dev unzip \
 && docker-php-ext-install soap zip \
 && a2enmod rewrite \
 && rm -rf /var/lib/apt/lists/*

# Muchos .pfx peruanos usan RC2/3DES: OpenSSL 3 necesita el proveedor legacy para abrirlos.
COPY docker/openssl-legacy.cnf /etc/ssl/openssl-legacy.cnf
ENV OPENSSL_CONF=/etc/ssl/openssl-legacy.cnf

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY composer.json composer.lock* ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts
COPY . .

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
 && sed -ri -e 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf

EXPOSE 80
