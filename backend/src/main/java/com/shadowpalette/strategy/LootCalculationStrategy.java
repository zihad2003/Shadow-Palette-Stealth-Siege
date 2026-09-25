package com.shadowpalette.strategy;

import com.shadowpalette.util.StealthConstants;
import org.springframework.stereotype.Component;

/**
 * Resource greed loot from time spent in the base.
 * Locked in only after a completed extraction (SILENT / ESCAPED); zero for CAUGHT / INCOMPLETE.
 */
@Component
public class LootCalculationStrategy {

    public double accumulatedLootPercent(double elapsedSeconds) {
        double elapsed = Math.max(0, elapsedSeconds);
        // Continuous accrual — matches frontend estimateLootPercent (no 10s stair-step).
        return Math.min(
                StealthConstants.MAX_LOOT_PERCENT,
                (elapsed / StealthConstants.LOOT_INTERVAL_SECONDS) * StealthConstants.LOOT_PERCENT_PER_INTERVAL
        );
    }

    public double outcomeMultiplier(String outcome) {
        if (outcome == null) return 0;
        return switch (outcome.trim().toUpperCase()) {
            case "SILENT" -> 1.0;
            case "ESCAPED" -> 1.5;
            default -> 0.0; // CAUGHT, INCOMPLETE
        };
    }

    public LootResult compute(double elapsedSeconds, int defenderCoins, int defenderInk, String outcome) {
        int coinPool = defenderCoins > 0 ? defenderCoins : StealthConstants.DEFENDER_COINS_FALLBACK;
        int inkPool = defenderInk > 0 ? defenderInk : StealthConstants.DEFENDER_INK_FALLBACK;
        double pct = accumulatedLootPercent(elapsedSeconds);
        double mult = outcomeMultiplier(outcome);
        int coins = (int) Math.round(coinPool * pct * mult);
        int ink = (int) Math.round(inkPool * pct * mult);
        return new LootResult(pct, coins, ink);
    }

    public record LootResult(double percent, int coinsLooted, int inkLooted) {}
}
