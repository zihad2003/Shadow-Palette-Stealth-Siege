package com.shadowpalette.service;

import com.shadowpalette.entity.User;
import com.shadowpalette.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class BotRegenJob {

    private final UserRepository userRepository;

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void regenerateBotResources() {
        for (BotSeeder.BotConfig cfg : BotSeeder.BOT_CONFIGS) {
            userRepository.findById(cfg.id()).ifPresent(bot -> {
                boolean updated = false;

                if (bot.getCoins() < cfg.coins()) {
                    bot.setCoins(Math.min(cfg.coins(), bot.getCoins() + 20));
                    updated = true;
                }
                if (bot.getInkEnergy() < cfg.ink()) {
                    bot.setInkEnergy(Math.min(cfg.ink(), bot.getInkEnergy() + 5));
                    updated = true;
                }
                if (bot.getChips() < cfg.chips()) {
                    bot.setChips(Math.min(cfg.chips(), bot.getChips() + 10));
                    updated = true;
                }

                if (updated) {
                    userRepository.save(bot);
                    log.debug("Regenerated resources for bot {} (coins={}, ink={}, chips={})",
                            bot.getUsername(), bot.getCoins(), bot.getInkEnergy(), bot.getChips());
                }
            });
        }
    }
}
