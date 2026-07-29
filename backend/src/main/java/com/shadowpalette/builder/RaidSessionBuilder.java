package com.shadowpalette.builder;

import com.shadowpalette.dto.RaidCompleteRequest;
import com.shadowpalette.dto.SessionLogTickDto;

import java.util.ArrayList;
import java.util.List;

/**
 * Builder Pattern: RaidSessionBuilder constructing raid simulation session payloads.
 */
public class RaidSessionBuilder {

    private Long attackerId;
    private Long defenderId;
    private int durationSeconds;
    private final List<SessionLogTickDto> sessionLog = new ArrayList<>();

    public RaidSessionBuilder setAttackerId(Long attackerId) {
        this.attackerId = attackerId;
        return this;
    }

    public RaidSessionBuilder setDefenderId(Long defenderId) {
        this.defenderId = defenderId;
        return this;
    }

    public RaidSessionBuilder setDurationSeconds(int durationSeconds) {
        this.durationSeconds = durationSeconds;
        return this;
    }

    public RaidSessionBuilder addTick(int tick, double xPos, double yPos) {
        this.sessionLog.add(SessionLogTickDto.builder().tick(tick).xPos(xPos).yPos(yPos).build());
        return this;
    }

    public RaidCompleteRequest build() {
        return RaidCompleteRequest.builder()
                .attackerId(this.attackerId)
                .defenderId(this.defenderId)
                .durationSeconds(this.durationSeconds)
                .sessionLog(this.sessionLog)
                .build();
    }
}
