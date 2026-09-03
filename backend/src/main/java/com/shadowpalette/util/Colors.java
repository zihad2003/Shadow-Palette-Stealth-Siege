package com.shadowpalette.util;

import java.util.Set;

public class Colors {
    public static final String RED = "#E74C3C";
    public static final String GREEN = "#72B83F";
    public static final String BLUE = "#536DDE";
    public static final String YELLOW = "#E5B93D";
    public static final String PURPLE = "#8D5CC7";
    public static final String WHITE = "#F1FAEE";

    public static final Set<String> ALLOWED_CAMO_COLORS = Set.of("RED", "GREEN", "BLUE", "YELLOW", "PURPLE");
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
