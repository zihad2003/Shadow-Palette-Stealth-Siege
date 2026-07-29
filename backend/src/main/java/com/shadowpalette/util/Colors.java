package com.shadowpalette.util;

import java.util.Set;

public class Colors {
    public static final String WHITE = "#F1FAEE";
    public static final String YELLOW = "#F4C245";
    public static final String GREEN = "#2A9D8F";
    public static final String RED = "#E63946";
    public static final String BLUE = "#264653";

    public static final Set<String> ALLOWED_CAMO_COLORS = Set.of("WHITE", "YELLOW", "GREEN", "RED", "BLUE");
    public static final double MAX_COLOR_QUOTA_PERCENT = 35.0;
    public static final int PLOT_TOTAL_TILES = 400; // 20x20 grid

    public static String normalizeHex(String hex) {
        if (hex == null) return WHITE;
        String cleaned = hex.trim().toUpperCase();
        if (cleaned.equals("#FFFFFF")) return WHITE;
        return cleaned;
    }

    public static double calculateUsagePercent(int colorTiles, int totalTiles) {
        if (totalTiles <= 0) return 0.0;
        return Math.round((colorTiles * 100.0 / totalTiles) * 10.0) / 10.0;
    }
}
