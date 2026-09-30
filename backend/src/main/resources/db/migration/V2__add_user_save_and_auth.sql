-- ========================================================================
-- V2__add_user_save_and_auth.sql
-- Adds persistent save state, optional passcode, and terms acceptance to user table.
-- ========================================================================

ALTER TABLE `user` ADD COLUMN `password` VARCHAR(255) NULL;
ALTER TABLE `user` ADD COLUMN `world_save_json` LONGTEXT NULL;
ALTER TABLE `user` ADD COLUMN `terms_accepted` BIT(1) NOT NULL DEFAULT 0;
