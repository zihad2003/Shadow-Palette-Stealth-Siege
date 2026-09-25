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

    private Double attackerX;
    private Double attackerY;
    private Instant attackerUpdatedAt;

    /** Null until defender joins and sends a pose. */
    private Double robotX;
    private Double robotY;
    private Instant robotUpdatedAt;

    private boolean joined;
    private Instant joinDeadline;
    private Instant createdAt;

    /** STOMP session ids for disconnect handling. */
    private String attackerWsSessionId;
    private String defenderWsSessionId;

    private boolean terminal;
    private String outcome; // CAUGHT when server detects catch

    public boolean isJoinExpired(Instant now) {
        return !joined && joinDeadline != null && !now.isBefore(joinDeadline);
    }
}
