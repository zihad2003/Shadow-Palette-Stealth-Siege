package com.shadowpalette.controller;

import com.shadowpalette.dto.VisitPositionMessage;
import com.shadowpalette.dto.VisitSessionDto;
import com.shadowpalette.security.UserPrincipal;
import com.shadowpalette.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class VisitStompController {

    private final PresenceService presenceService;

    @MessageMapping("/visit/{visitId}/position")
    public VisitSessionDto position(
            @Payload VisitPositionMessage msg,
            java.security.Principal principal
    ) {
        return presenceService.updatePositionStomp(msg, extractUserId(principal));
    }

    private static Long extractUserId(java.security.Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth) {
            Object p = auth.getPrincipal();
            if (p instanceof UserPrincipal up) {
                return up.getUserId();
            }
        }
        return null;
    }
}
