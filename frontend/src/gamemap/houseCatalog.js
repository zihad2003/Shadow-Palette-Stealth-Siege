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
    use: 'Pick one of the five paint colors.',
    after: 'Ink still refills while you play.',
    roof: 'PURPLE',
  },
  CRAFT_HOUSE: {
    name: 'Craft House',
    need: 'Hold F on the ruin to rebuild.',
    use: 'Upgrade a house from the workshop.',
    after: 'Also makes Hold F rebuilds faster.',
    roof: 'GREEN',
  },
  COIN_GENERATOR: {
    name: 'Coin House',
    need: 'Hold F on the ruin to rebuild.',
    use: 'Coins pile up here. Collect them.',
    after: 'Higher level mints more.',
    roof: 'YELLOW',
  },
  MAKEUP_HOUSE: {
    name: 'Makeup House',
    need: 'Always open.',
    use: 'Change the camo on your clothes.',
    after: 'Camo locks for a raid.',
    roof: 'PURPLE',
  },
};

export function houseInfo(type) {
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
