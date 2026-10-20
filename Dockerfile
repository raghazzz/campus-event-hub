# Web server for Campus Event Hub: Apache + PHP with the MySQL extension
FROM php:8.2-apache
RUN docker-php-ext-install mysqli
COPY . /var/www/html/
