package com.shadowpalette.liveraid;

import com.shadowpalette.config.WebSocketConfig;
import com.shadowpalette.liveraid.dto.LiveRaidJoinRequest;
import com.shadowpalette.liveraid.dto.LiveRaidPositionMessage;
import com.shadowpalette.security.JwtUtil;
import com.shadowpalette.security.UserPrincipal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
class StompAuthTest {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private WebSocketConfig webSocketConfig;

    @Test
    @DisplayName("LiveRaidController extracts userId from Principal in join and position")
    void testLiveRaidControllerExtractsPrincipal() {
        LiveRaidService mockService = mock(LiveRaidService.class);
        LiveRaidController controller = new LiveRaidController(mockService);

        UserPrincipal principal = new UserPrincipal(101L, "TestAgent");
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                principal, null, Collections.emptyList()
        );

        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.create();
        headers.setSessionId("sess-1");

        // 1. Join with Principal
        LiveRaidJoinRequest joinReq = LiveRaidJoinRequest.builder().build();
        controller.join("raid-1", joinReq, headers, auth);
        verify(mockService).join(eq("raid-1"), eq(joinReq), eq("sess-1"), eq(101L));

        // 2. Position with Principal
        LiveRaidPositionMessage posReq = LiveRaidPositionMessage.builder().role("DEFENDER").x(5.0).y(5.0).build();
        controller.position("raid-1", posReq, headers, auth);
        verify(mockService).updatePosition(eq("raid-1"), eq(posReq), eq("sess-1"), eq(101L));

        // 3. Join without Principal -> passes null
        controller.join("raid-1", joinReq, headers, null);
        verify(mockService).join(eq("raid-1"), eq(joinReq), eq("sess-1"), isNull());
    }

    @Test
    @DisplayName("STOMP CONNECT channel interceptor rejects missing or invalid JWT and accepts valid JWT")
    void testStompConnectAuthInterceptor() {
        // Retrieve the registered ChannelInterceptor configured by WebSocketConfig
        org.springframework.messaging.simp.config.ChannelRegistration registration =
                new org.springframework.messaging.simp.config.ChannelRegistration();
        webSocketConfig.configureClientInboundChannel(registration);

        @SuppressWarnings("unchecked")
        List<ChannelInterceptor> interceptors =
                (List<ChannelInterceptor>) ReflectionTestUtils.getField(registration, "interceptors");
        assertNotNull(interceptors);
        assertFalse(interceptors.isEmpty());
        ChannelInterceptor interceptor = interceptors.get(0);

        MessageChannel dummyChannel = mock(MessageChannel.class);

        // Case A: Missing Authorization header -> MessageDeliveryException
        StompHeaderAccessor missingAcc = StompHeaderAccessor.create(StompCommand.CONNECT);
        Message<byte[]> missingMsg = MessageBuilder.createMessage(new byte[0], missingAcc.getMessageHeaders());
        assertThrows(MessageDeliveryException.class, () -> {
            interceptor.preSend(missingMsg, dummyChannel);
        }, "Missing JWT must throw MessageDeliveryException");

        // Case B: Invalid Authorization header -> MessageDeliveryException
        StompHeaderAccessor invalidAcc = StompHeaderAccessor.create(StompCommand.CONNECT);
        invalidAcc.setNativeHeader("Authorization", "Bearer invalid.jwt.token");
        Message<byte[]> invalidMsg = MessageBuilder.createMessage(new byte[0], invalidAcc.getMessageHeaders());
        assertThrows(MessageDeliveryException.class, () -> {
            interceptor.preSend(invalidMsg, dummyChannel);
        }, "Invalid JWT must throw MessageDeliveryException");

        // Case C: Valid Authorization header -> Sets authenticated Principal
        String token = jwtUtil.generateToken(101L, "TestAgent");
        StompHeaderAccessor validAcc = StompHeaderAccessor.create(StompCommand.CONNECT);
        validAcc.setLeaveMutable(true);
        validAcc.setNativeHeader("Authorization", "Bearer " + token);
        Message<byte[]> validMsg = MessageBuilder.createMessage(new byte[0], validAcc.getMessageHeaders());

        Message<?> result = interceptor.preSend(validMsg, dummyChannel);
        assertNotNull(result);
        StompHeaderAccessor resultAcc = StompHeaderAccessor.wrap(result);
        assertNotNull(resultAcc.getUser(), "Authenticated user principal should be set on accessor");
        assertTrue(resultAcc.getUser() instanceof UsernamePasswordAuthenticationToken);
        UserPrincipal userPrincipal = (UserPrincipal) ((UsernamePasswordAuthenticationToken) resultAcc.getUser()).getPrincipal();
        assertEquals(101L, userPrincipal.getUserId());
        assertEquals("TestAgent", userPrincipal.getUsername());
    }
}
