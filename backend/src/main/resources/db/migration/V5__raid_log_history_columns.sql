-- V5: Add live flag, defender online flag, raid ID, ended reason to raid_log
ALTER TABLE raid_log ADD COLUMN is_live BIT(1) NOT NULL DEFAULT 0;
ALTER TABLE raid_log ADD COLUMN defender_was_online BIT(1) NOT NULL DEFAULT 0;
ALTER TABLE raid_log ADD COLUMN raid_id VARCHAR(255) NULL;
ALTER TABLE raid_log ADD COLUMN ended_reason VARCHAR(100) NULL;

-- Unique constraint on raid_id
ALTER TABLE raid_log ADD CONSTRAINT uq_raid_log_raid_id UNIQUE (raid_id);
