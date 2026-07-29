package com.shadowpalette.session;

import lombok.Getter;
import lombok.Setter;

/**
 * Singleton Pattern: GameSessionManager managing global game session state.
 */
public class GameSessionManager {

    private static volatile GameSessionManager instance;

    @Getter
    @Setter
    private Long activeUserId;

    @Getter
    @Setter
    private String currentPhase = "BUILD"; // BUILD, RAID, ESCAPE

    private GameSessionManager() {
        this.activeUserId = 12L;
    }

    public static GameSessionManager getInstance() {
        if (instance == null) {
            synchronized (GameSessionManager.class) {
                if (instance == null) {
                    instance = new GameSessionManager();
                }
            }
        }
        return instance;
    }
}
