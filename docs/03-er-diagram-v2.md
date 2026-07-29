# ER Diagram v2 — Shadow Palette: Stealth & Siege

```mermaid
erDiagram
    USER ||--o{ PLOT : owns
    PLOT ||--o{ BUILDING : contains
    PLOT ||--o| LIGHTHOUSE : "has one"
    PLOT ||--o| PATROLROBOT : "has one (if unlocked)"
    PLOT ||--o{ WALLBLOCK : "bounded by"
    USER ||--o{ RAIDLOG : "attacks as"
    USER ||--o{ RAIDLOG : "defends as"
    BUILDING ||--|| CRAFTHOUSE : "is-a"
    BUILDING ||--|| INKHOUSE : "is-a"
    BUILDING ||--|| SLEEPHOUSE : "is-a"
    BUILDING ||--|| COINGENERATOR : "is-a"

    USER {
        long id PK
        string username
        int coins
        int inkEnergy
        int chips
        int characterModel "1-3, cosmetic"
        string camoColor "WHITE/RED/GREEN/BLUE/YELLOW, permanent"
        int prestigeLevel
    }

    PLOT {
        long id PK
        int xCoord
        int yCoord
        long ownerId FK
        boolean isOccupied
        long version "optimistic lock"
    }

    BUILDING {
        long id PK
        long plotId FK
        string buildingType
        int modelVariant "1-3"
        int level "1-3"
        string hexColor
        int xPos
        int yPos
        int footprintWidth
        int footprintHeight
    }

    LIGHTHOUSE {
        long id PK
        long plotId FK
        int modelVariant "1-3"
        int coneAngle
        int coneRange
        float sweepSpeed
    }

    PATROLROBOT {
        long id PK
        long plotId FK
        string currentState "PATROL/SUSPICIOUS/ALERT/CHASING/SEARCHING"
        float baseSpeed
    }

    WALLBLOCK {
        long id PK
        long plotId FK
        int xPos
        int yPos
        string hexColor
        boolean isGate
        boolean isLocked
        int breakProgress "0-4, persistent"
    }

    RAIDLOG {
        long id PK
        long attackerId FK
        long defenderId FK
        int stolenChips
        boolean isDetected
        string outcome "SILENT/ESCAPED/CAUGHT"
        datetime timestamp
        int durationSeconds
        text sessionLogJson
    }
```

## Notes
- `Building` uses JPA `@Inheritance(strategy = JOINED)` for `CraftHouse`, `InkHouse`, `SleepHouse`, `CoinGenerator` — gives the `BuildingFactory` real polymorphic output.
- `Lighthouse` and `PatrolRobot` are separate tables (not `Building` subclasses) since they're defense-specific with a hard 1-per-plot constraint — enforce via a unique constraint on `plotId`.
- `WallBlock.isGate` marks the single entry gate; `isLocked` flips true when an alarm triggers; `breakProgress` persists across interruptions (never resets).
- `Plot.version` is a `@Version` field for optimistic locking on plot purchase races.
- `RaidLog.sessionLogJson` stores enough replay data (tick-by-tick position + color state) for server-side outcome validation.
