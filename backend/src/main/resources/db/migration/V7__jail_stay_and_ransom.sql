CREATE TABLE jail_stay (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prisoner_id BIGINT NOT NULL,
    captor_id BIGINT NOT NULL,
    raid_id VARCHAR(64) NULL,
    jailed_at DATETIME(6) NOT NULL,
    release_at DATETIME(6) NOT NULL,
    status VARCHAR(32) NOT NULL,
    ransom_offer_count INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_js_prisoner ON jail_stay (prisoner_id);
CREATE INDEX idx_js_captor ON jail_stay (captor_id);
CREATE INDEX idx_js_status ON jail_stay (status);

CREATE TABLE ransom_offer (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    jail_stay_id BIGINT NOT NULL,
    offered_by VARCHAR(32) NOT NULL,
    coins INT NOT NULL,
    message VARCHAR(255) NULL,
    status VARCHAR(32) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    expires_at DATETIME(6) NULL,
    round_number INT NOT NULL DEFAULT 1
);

CREATE INDEX idx_ro_stay ON ransom_offer (jail_stay_id);
CREATE INDEX idx_ro_status ON ransom_offer (status);
