-- Run this once against your MySQL server (e.g. via MySQL Workbench, or:
--   mysql -u root -p < setup.sql
-- ) to create the database and a dedicated application user for Encode Studio.
-- Replace 'change-me' with a real password, then put the same values in backend/.env

CREATE DATABASE IF NOT EXISTS encodestudio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'encodestudio_app'@'localhost' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON encodestudio.* TO 'encodestudio_app'@'localhost';
FLUSH PRIVILEGES;
