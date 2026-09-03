package com.shadowpalette.stealth;

import com.shadowpalette.util.Colors;

public final class ColorMatchSystem {

    private ColorMatchSystem() {}

    public static boolean isMatch(String attackerColor, String tileColor) {
        if (attackerColor == null || tileColor == null || tileColor.isBlank()) {
            return false;
        }
        String a = attackerColor.trim().toUpperCase();
        String t = tileColor.trim().toUpperCase();
        if (!Colors.ALLOWED_CAMO_COLORS.contains(a)) {
            return false;
        }
        return a.equals(t);
    }
}
