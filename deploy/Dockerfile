FROM php:8.4.27-fpm-alpine@sha256:93aa3f61216b73cc6f878235c9772849449f4efc18dfe3d6678eed645076c00d

RUN apk add --no-cache freetype libjpeg-turbo libpng libzip icu-libs oniguruma \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
       freetype-dev libjpeg-turbo-dev libpng-dev libzip-dev icu-dev oniguruma-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j2 gd zip intl mbstring exif opcache \
    && apk del .build-deps

RUN apk add --no-cache icu-data-full

WORKDIR /var/www/html
