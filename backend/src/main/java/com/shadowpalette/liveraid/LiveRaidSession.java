package com.shadowpalette.liveraid;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * In-memory live-raid takeover state. Async AI raids never touch this;
 * entries exist only while a defender is invited / joined.
 */
@Data
@Builder
public class LiveRaidSession {
    private String raidId;
    private Long attackerUserId;
    private Long defenderUserId;
    private String attackerName;
    private Integer attackerModel;
    private String attackerCamo;

    private Double attackerX;
    private Double attackerY;
    private Instant attackerUpdatedAt;

    /** Null until defender joins and sends a pose. */
    private Double robotX;
    private Double robotY;
    private Instant robotUpdatedAt;
    /** Owner's character look so the attacker renders a player, not a robot. */
    private Integer defenderModel;
    private String defenderCamo;

    private boolean joined;
    private Instant joinDeadline;
    private Instant createdAt;

    /** STOMP session ids for disconnect handling. */
    private String attackerWsSessionId;
    private String defenderWsSessionId;

    private boolean terminal;
    private String outcome; // CAUGHT when server detects catch
    private String status; // CARRIED | JAIL_LOCKED | RELEASED

    public boolean isJoinExpired(Instant now) {
        return !joined && joinDeadline != null && !now.isBefore(joinDeadline);
    }
}
