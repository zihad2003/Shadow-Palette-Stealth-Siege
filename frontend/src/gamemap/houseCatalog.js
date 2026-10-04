import { GAME_COLORS } from '../colors.js';

export const HOUSE_INFO = {
  SLEEP_HOUSE: {
    name: 'Sleep House',
    need: 'Hold F on the ruin to rebuild.',
    use: 'Sleep to save the base and pass one day.',
    after: '+100 coins. Coin houses mint the new day.',
    roof: 'BLUE',
  },
  INK_HOUSE: {
    name: 'Ink House',
    need: 'Hold F on the ruin to rebuild.',
    use: 'Collect stored ink, then pick a paint color.',
    after: 'Makeup House still changes camo.',
    roof: 'PURPLE',
  },
  CRAFT_HOUSE: {
    name: 'Craft House',
    need: 'Hold F on the ruin to rebuild.',
    use: 'Buy the patrol robot, then toggle it on or off.',
    after: 'On costs 1c / 30s. Off parks it inside this house.',
    roof: 'GREEN',
  },
  COIN_GENERATOR: {
    name: 'Coin House',
    need: 'Hold F on the ruin to rebuild.',
    use: 'Coins pile up here. Collect them.',
    after: 'Higher level mints more.',
    roof: 'YELLOW',
  },
  JAIL: {
    name: 'Base Jail',
    need: 'Hold F on the ruin to rebuild.',
    use: 'Holding cell. Only you can lock a live raider here.',
    after: 'Hold F 3s on a raider, then drop them at this cell.',
    roof: 'RED',
  },
  MAKEUP_HOUSE: {
    name: 'Makeup House',
    need: 'Hold F on the ruin to rebuild.',
    use: 'Change the camo on your clothes.',
    after: 'Camo locks for a raid.',
    roof: 'PURPLE',
  },
};

export function houseInfo(type) {
  if (type === 'BASE_JAIL') return HOUSE_INFO.JAIL;
  return HOUSE_INFO[type] || {
    name: 'House',
    need: 'Hold F to rebuild.',
    use: 'Stand close for details.',
    after: '',
    roof: 'BLUE',
  };
}

export function houseRoofHex(type, paintedHex) {
  const info = houseInfo(type);
  if (paintedHex && String(paintedHex).toUpperCase() !== '#9A958C') return paintedHex;
  return GAME_COLORS[info.roof] || GAME_COLORS.BLUE;
}
