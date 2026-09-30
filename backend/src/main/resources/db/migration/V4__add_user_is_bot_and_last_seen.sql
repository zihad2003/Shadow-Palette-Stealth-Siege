-- V4: Add bot flag, last-seen timestamp, unique plot ownership, and jail table
ALTER TABLE `user` ADD COLUMN is_bot BIT(1) NOT NULL DEFAULT 0;
ALTER TABLE `user` ADD COLUMN last_seen_at DATETIME(6) NULL;

-- Each user may own at most one plot
ALTER TABLE plot ADD CONSTRAINT uq_plot_owner_id UNIQUE (owner_id);

-- Jail building subtype
CREATE TABLE IF NOT EXISTS jail (
    building_id BIGINT NOT NULL PRIMARY KEY,
    prisoner_capacity INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_jail_building FOREIGN KEY (building_id) REFERENCES building(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
