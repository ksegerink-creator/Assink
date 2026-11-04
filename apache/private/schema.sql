-- Database voor de formulieren van assinkschipholt.nl (DirectAdmin-server).
--
-- Eenmalig uitvoeren in phpMyAdmin (database assink_web) of met de
-- mysql-client. De PHP-verwerker maakt dezelfde tabellen ook zelf aan als ze
-- ontbreken; dit bestand is er om te zien wat er precies wordt opgeslagen.
--
-- Wat er NIET wordt opgeslagen: de bijlagen zelf (alleen naam en grootte; de
-- bestanden gaan alleen met de mail mee) en het IP-adres (alleen een gezouten
-- hash, en alleen tien minuten, voor de beperking op het aantal berichten per
-- verbinding).

CREATE TABLE IF NOT EXISTS aanvragen (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ontvangen_op DATETIME NOT NULL COMMENT 'UTC',
  taal CHAR(2) NOT NULL,
  soort VARCHAR(10) NOT NULL COMMENT 'hero, contact of offerte',
  naam VARCHAR(200) NOT NULL,
  bedrijf VARCHAR(200) NOT NULL DEFAULT '',
  email VARCHAR(254) NOT NULL,
  telefoon VARCHAR(60) NOT NULL DEFAULT '',
  omschrijving TEXT NULL,
  bericht TEXT NULL,
  bewerking VARCHAR(200) NULL,
  aantal VARCHAR(200) NULL,
  toelichting TEXT NULL,
  bijlagen TEXT NULL COMMENT 'bestandsnamen en groottes, geen inhoud',
  verzonden TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = mail door Microsoft 365 aangenomen',
  verzendfout VARCHAR(500) NULL,
  PRIMARY KEY (id),
  KEY ontvangen_op (ontvangen_op)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS formulier_pogingen (
  ip_hash CHAR(64) NOT NULL,
  poging_op INT UNSIGNED NOT NULL COMMENT 'Unix-tijd',
  KEY ip_hash (ip_hash, poging_op)
) ENGINE=InnoDB DEFAULT CHARSET=ascii;
