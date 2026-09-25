package com.shadowpalette.liveraid;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LiveRaidRegistry {

    private final ConcurrentHashMap<String, LiveRaidSession> sessions = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> wsSessionToRaid = new ConcurrentHashMap<>();

    public void put(LiveRaidSession session) {
        sessions.put(session.getRaidId(), session);
    }

    public Optional<LiveRaidSession> get(String raidId) {
        return Optional.ofNullable(sessions.get(raidId));
    }

    public LiveRaidSession remove(String raidId) {
        LiveRaidSession removed = sessions.remove(raidId);
        if (removed != null) {
            if (removed.getAttackerWsSessionId() != null) {
                wsSessionToRaid.remove(removed.getAttackerWsSessionId(), raidId);
            }
            if (removed.getDefenderWsSessionId() != null) {
                wsSessionToRaid.remove(removed.getDefenderWsSessionId(), raidId);
            }
        }
        return removed;
    }

    public Collection<LiveRaidSession> all() {
        return sessions.values();
    }

    public void bindWsSession(String wsSessionId, String raidId) {
        if (wsSessionId != null && raidId != null) {
            wsSessionToRaid.put(wsSessionId, raidId);
        }
    }

    public Optional<String> raidIdForWsSession(String wsSessionId) {
        return Optional.ofNullable(wsSessionToRaid.get(wsSessionId));
    }

    public void unbindWsSession(String wsSessionId) {
        if (wsSessionId != null) {
            wsSessionToRaid.remove(wsSessionId);
        }
    }
}
