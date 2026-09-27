package com.shadowpalette.duo;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory registry for active duo parties. This state is <b>ephemeral</b> — it does NOT
 * survive a Render free-tier restart or a redeployment. If the server process restarts,
 * all active duo parties are lost. The frontend must handle a suddenly-vanished party
 * gracefully (see DuoService and GameStateContext error handling).
 *
 * TODO: For production durability, migrate duo party state to the database with a
 *       cleanup job for stale entries.
 */
@Component
public class DuoRegistry {

    private final ConcurrentHashMap<String, DuoParty> parties = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, String> userToParty = new ConcurrentHashMap<>();

    public void put(DuoParty party) {
        parties.put(party.getPartyId(), party);
        if (party.getHostId() != null) userToParty.put(party.getHostId(), party.getPartyId());
        if (party.getGuestId() != null) userToParty.put(party.getGuestId(), party.getPartyId());
    }

    public Optional<DuoParty> get(String partyId) {
        return Optional.ofNullable(parties.get(partyId));
    }

    public Optional<DuoParty> forUser(Long userId) {
        if (userId == null) return Optional.empty();
        String id = userToParty.get(userId);
        return id != null ? get(id) : Optional.empty();
    }

    public DuoParty remove(String partyId) {
        DuoParty p = parties.remove(partyId);
        if (p != null) {
            if (p.getHostId() != null) userToParty.remove(p.getHostId(), partyId);
            if (p.getGuestId() != null) userToParty.remove(p.getGuestId(), partyId);
        }
        return p;
    }

    public Collection<DuoParty> all() {
        return parties.values();
    }
}
