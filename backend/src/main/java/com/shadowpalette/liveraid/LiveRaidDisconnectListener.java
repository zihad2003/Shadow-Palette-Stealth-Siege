package com.shadowpalette.liveraid;

import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
@RequiredArgsConstructor
public class LiveRaidDisconnectListener {

    private final LiveRaidService liveRaidService;

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        if (event.getSessionId() != null) {
            liveRaidService.onWsDisconnect(event.getSessionId());
        }
    }
}
