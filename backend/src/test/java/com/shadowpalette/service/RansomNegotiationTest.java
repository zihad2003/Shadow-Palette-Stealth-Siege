package com.shadowpalette.service;

import com.shadowpalette.dto.RansomOfferDto;
import com.shadowpalette.dto.RansomResponse;
import com.shadowpalette.entity.JailStay;
import com.shadowpalette.entity.RansomOffer;
import com.shadowpalette.entity.User;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.repository.JailStayRepository;
import com.shadowpalette.repository.RansomOfferRepository;
import com.shadowpalette.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RansomNegotiationTest {

    @Autowired
    private JailService jailService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JailStayRepository jailStayRepository;

    @Autowired
    private RansomOfferRepository ransomOfferRepository;

    @Test
    @DisplayName("Ransom negotiation: outsider rejected, over-balance rejected, valid accept transfers coins and releases")
    void testRansomNegotiationRules() {
        User prisoner = userRepository.save(User.builder()
                .id(4001L)
                .username("Hostage")
                .coins(300)
                .inkEnergy(50)
                .chips(100)
                .isBot(false)
                .build());

        User captor = userRepository.save(User.builder()
                .id(4002L)
                .username("Jailer")
                .coins(500)
                .inkEnergy(100)
                .chips(200)
                .isBot(false)
                .build());

        User outsider = userRepository.save(User.builder()
                .id(4003L)
                .username("Bystander")
                .coins(1000)
                .inkEnergy(100)
                .chips(200)
                .isBot(false)
                .build());

        JailStay stay = jailService.createJailStay(prisoner.getId(), captor.getId(), "raid_ransom_1");
        assertNotNull(stay);

        // 1. Outsider cannot make offer
        ApiException outEx = assertThrows(ApiException.class, () -> {
            jailService.createOffer(stay.getId(), outsider.getId(), 50, "Let me pay");
        });
        assertEquals("NOT_PARTICIPANT", outEx.getMessage());

        // 2. Prisoner cannot offer more coins than they have (300 available, offering 500)
        ApiException overEx = assertThrows(ApiException.class, () -> {
            jailService.createOffer(stay.getId(), prisoner.getId(), 500, "I can pay 500!");
        });
        assertEquals("INSUFFICIENT_COINS", overEx.getMessage());

        // 3. Captor creates valid offer demanding 150 coins
        RansomOfferDto offerDto = jailService.createOffer(stay.getId(), captor.getId(), 150, "Pay 150 or stay 3 minutes");
        assertNotNull(offerDto);
        assertEquals("CAPTOR", offerDto.getOfferedBy());
        assertEquals(150, offerDto.getCoins());
        assertEquals("PENDING", offerDto.getStatus());

        // 4. Captor cannot accept their own offer
        ApiException selfAcceptEx = assertThrows(ApiException.class, () -> {
            jailService.acceptOffer(offerDto.getId(), captor.getId());
        });
        assertEquals("CANNOT_ACCEPT_OWN_OFFER", selfAcceptEx.getMessage());

        // 5. Outsider cannot accept offer
        ApiException outAcceptEx = assertThrows(ApiException.class, () -> {
            jailService.acceptOffer(offerDto.getId(), outsider.getId());
        });
        assertEquals("NOT_PARTICIPANT", outAcceptEx.getMessage());

        // 6. Prisoner accepts the offer -> 150 coins transferred, prisoner released, total coins conserved
        int totalBefore = prisoner.getCoins() + captor.getCoins(); // 300 + 500 = 800

        RansomResponse acceptResp = jailService.acceptOffer(offerDto.getId(), prisoner.getId());
        assertTrue(acceptResp.isSuccess());
        assertEquals("ACCEPTED", acceptResp.getStatus());
        assertEquals(150, acceptResp.getCoinsTransferred());

        // Verify balances in database
        User updatedPrisoner = userRepository.findById(prisoner.getId()).orElseThrow();
        User updatedCaptor = userRepository.findById(captor.getId()).orElseThrow();

        assertEquals(150, updatedPrisoner.getCoins(), "Prisoner debited by 150 (300 - 150)");
        assertEquals(650, updatedCaptor.getCoins(), "Captor credited by 150 (500 + 150)");
        assertEquals(totalBefore, updatedPrisoner.getCoins() + updatedCaptor.getCoins(), "Coins strictly conserved");

        // Verify stay is RELEASED and prisoner is no longer jailed
        JailStay updatedStay = jailStayRepository.findById(stay.getId()).orElseThrow();
        assertEquals("RELEASED", updatedStay.getStatus());
        assertFalse(jailService.isJailed(prisoner.getId()), "Prisoner should now be freed");
    }

    @Test
    @DisplayName("Expired ransom offer cannot be accepted")
    void testExpiredOfferRejected() {
        User prisoner = userRepository.save(User.builder().id(4011L).username("P").coins(500).build());
        User captor = userRepository.save(User.builder().id(4012L).username("C").coins(500).build());
        JailStay stay = jailService.createJailStay(prisoner.getId(), captor.getId(), "raid_expired");

        RansomOfferDto offer = jailService.createOffer(stay.getId(), captor.getId(), 50, "Quick offer");

        // Manually expire the offer
        RansomOffer entity = ransomOfferRepository.findById(offer.getId()).orElseThrow();
        entity.setExpiresAt(LocalDateTime.now().minusSeconds(5));
        ransomOfferRepository.save(entity);

        ApiException ex = assertThrows(ApiException.class, () -> {
            jailService.acceptOffer(offer.getId(), prisoner.getId());
        });
        assertEquals("OFFER_EXPIRED", ex.getMessage());
    }
}
