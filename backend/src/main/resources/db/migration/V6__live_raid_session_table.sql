CREATE TABLE live_raid_session (
    raid_id VARCHAR(64) NOT NULL PRIMARY KEY,
    attacker_id BIGINT NOT NULL,
    defender_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    ended_at DATETIME(6) NULL
);

CREATE INDEX idx_lrs_attacker ON live_raid_session (attacker_id);
CREATE INDEX idx_lrs_defender ON live_raid_session (defender_id);
CREATE INDEX idx_lrs_status ON live_raid_session (status);
