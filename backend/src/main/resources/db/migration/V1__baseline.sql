-- ========================================================================
-- V1__baseline.sql
-- Baseline schema matching the current Hibernate entity state.
-- Generated as part of the Flyway migration introduction.
-- ========================================================================

-- User table (backtick-quoted because "user" is a MySQL reserved word)
CREATE TABLE IF NOT EXISTS `user` (
    id                  BIGINT       NOT NULL PRIMARY KEY,
    username            VARCHAR(255) NOT NULL,
    coins               INT          NOT NULL DEFAULT 500,
    ink_energy          INT          NOT NULL DEFAULT 100,
    chips               INT          NOT NULL DEFAULT 200,
    character_model     INT          NOT NULL DEFAULT 1,
    camo_color          VARCHAR(50),
    prestige_level      INT          NOT NULL DEFAULT 0,
    raid_cooldown_until DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Plot table
CREATE TABLE IF NOT EXISTS plot (
    id          BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    x_coord     INT    NOT NULL DEFAULT 0,
    y_coord     INT    NOT NULL DEFAULT 0,
    owner_id    BIGINT,
    is_occupied BIT(1) NOT NULL DEFAULT 0,
    version     BIGINT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Building (base table — JOINED inheritance)
CREATE TABLE IF NOT EXISTS building (
    id               BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    plot_id          BIGINT,
    building_type    VARCHAR(255),
    model_variant    INT          NOT NULL DEFAULT 1,
    level            INT          NOT NULL DEFAULT 1,
    hex_color        VARCHAR(50),
    x_pos            INT          NOT NULL DEFAULT 0,
    y_pos            INT          NOT NULL DEFAULT 0,
    footprint_width  INT          NOT NULL DEFAULT 3,
    footprint_height INT          NOT NULL DEFAULT 3
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Building sub-types (JOINED inheritance)
CREATE TABLE IF NOT EXISTS craft_house (
    building_id BIGINT NOT NULL PRIMARY KEY,
    CONSTRAINT fk_craft_house_building FOREIGN KEY (building_id) REFERENCES building(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ink_house (
    building_id BIGINT NOT NULL PRIMARY KEY,
    CONSTRAINT fk_ink_house_building FOREIGN KEY (building_id) REFERENCES building(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sleep_house (
    building_id BIGINT NOT NULL PRIMARY KEY,
    CONSTRAINT fk_sleep_house_building FOREIGN KEY (building_id) REFERENCES building(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS coin_generator (
    building_id BIGINT NOT NULL PRIMARY KEY,
    CONSTRAINT fk_coin_generator_building FOREIGN KEY (building_id) REFERENCES building(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Lighthouse
CREATE TABLE IF NOT EXISTS lighthouse (
    id            BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    plot_id       BIGINT NOT NULL UNIQUE,
    model_variant INT    NOT NULL DEFAULT 1,
    cone_angle    INT    NOT NULL DEFAULT 60,
    cone_range    INT    NOT NULL DEFAULT 7,
    sweep_speed   FLOAT  NOT NULL DEFAULT 1.0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Patrol robot
CREATE TABLE IF NOT EXISTS patrol_robot (
    id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    plot_id       BIGINT       NOT NULL UNIQUE,
    current_state VARCHAR(255),
    base_speed    FLOAT        NOT NULL DEFAULT 1.0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Wall block
CREATE TABLE IF NOT EXISTS wall_block (
    id             BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    plot_id        BIGINT,
    x_pos          INT          NOT NULL DEFAULT 0,
    y_pos          INT          NOT NULL DEFAULT 0,
    hex_color      VARCHAR(50),
    is_gate        BIT(1)       NOT NULL DEFAULT 0,
    is_locked      BIT(1)       NOT NULL DEFAULT 0,
    break_progress INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Raid log
CREATE TABLE IF NOT EXISTS raid_log (
    id               BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    attacker_id      BIGINT,
    defender_id      BIGINT,
    stolen_chips     INT          NOT NULL DEFAULT 0,
    stolen_coins     INT          NOT NULL DEFAULT 0,
    stolen_ink       INT          NOT NULL DEFAULT 0,
    is_detected      BIT(1)       NOT NULL DEFAULT 0,
    outcome          VARCHAR(50),
    `timestamp`      DATETIME(6),
    duration_seconds INT          NOT NULL DEFAULT 0,
    session_log_json TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Visit invite
CREATE TABLE IF NOT EXISTS visit_invite (
    id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    host_id    BIGINT,
    guest_id   BIGINT,
    status     VARCHAR(50),
    expires_at DATETIME(6),
    created_at DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
