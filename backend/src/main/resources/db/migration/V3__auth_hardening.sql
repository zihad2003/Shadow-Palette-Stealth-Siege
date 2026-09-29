-- V3: Authentication Hardening

ALTER TABLE `user` ADD COLUMN password_hash VARCHAR(255) NULL;
ALTER TABLE `user` ADD COLUMN guest_secret_hash VARCHAR(255) NULL;
