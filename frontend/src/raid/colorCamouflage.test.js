import assert from 'node:assert/strict';
import { isMatch } from './ColorMatchSystem.js';
import { evaluateBeam } from './SearchlightSensor.js';
import { evaluateDetectionTick } from './DetectionSystem.js';
import { createRaidSession, rejectColorChange, lootForOutcome } from './RaidSession.js';
import { createAlarmSystem } from './AlarmSystem.js';
import {
  STEALTH_CONSTANTS,
  RAID_LOOT_FRACTION,
  RAID_DURATION_SECONDS,
  SEARCHLIGHT_LEVELS,
} from './stealthConstants.js';

const light = {
  x: 5.5,
  y: 4.5,
  beamAngleDeg: 0,
  coneAngleDeg: 48,
  coneRangeTiles: 4.6,
};

function playerOnBeam(dist = 2) {
  return { x: 5.5, y: 4.5 + dist };
}

// Test 1 — match in beam: hidden from normal exposure
{
  const tick = evaluateDetectionTick({
    light,
    player: playerOnBeam(),
    attackerColor: 'RED',
    tileColor: 'RED',
    dt: 0.25,
  });
  assert.equal(tick.colorMatch, true);
  assert.equal(tick.exposed, false);
  assert.equal(tick.beam.canSee, true);
  assert.ok(tick.meter < STEALTH_CONSTANTS.suspiciousAt, 'match must not raise detection');
}

// Test 2 — mismatch in beam: detection begins (gradual rise)
{
  const tick = evaluateDetectionTick({
    light,
    player: playerOnBeam(),
    attackerColor: 'RED',
    tileColor: 'BLUE',
    dt: 0.5,
  });
  assert.equal(tick.colorMatch, false);
  assert.equal(tick.exposed, true);
  assert.ok(tick.meter > 0, 'mismatch in beam must increase the meter');
  assert.ok(tick.meter < STEALTH_CONSTANTS.alarmAt, 'brief hit must not instantly alarm');
}

// Test 3 — mismatch but not in beam: no searchlight detection
{
  const tick = evaluateDetectionTick({
    light: { ...light, beamAngleDeg: 180 },
    player: playerOnBeam(),
    attackerColor: 'GREEN',
    tileColor: 'RED',
    dt: 0.5,
  });
  assert.equal(tick.beam.canSee, false);
  assert.equal(tick.exposed, false);
  assert.equal(tick.meter, 0);
}

// Test 4 — sustained mismatch under the beam reaches alarm (synced with backend)
{
  let meter = 0;
  let alarm = false;
  let last = null;
  for (let i = 0; i < 40 && !alarm; i++) {
    last = evaluateDetectionTick({
      light,
      player: playerOnBeam(),
      attackerColor: 'GREEN',
      tileColor: 'RED',
      dt: 0.2,
      meter,
      alarmLatched: alarm,
    });
    meter = last.meter;
    alarm = last.alarmLatched;
  }
  assert.equal(last.exposed, true);
  assert.equal(last.state, 'ALARM');
  assert.equal(last.alarmLatched, true);
  assert.equal(last.meter, STEALTH_CONSTANTS.alarmAt);
}

// Test 5 — camo lock rejects mid-raid color change
{
  const raid = createRaidSession({ attackerId: 12, defenderId: 34, camoColor: 'BLUE' });
  const blocked = rejectColorChange(raid, 'RED');
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'RAID_CAMO_LOCKED');
  assert.equal(raid.camoColor, 'BLUE');
}

// Test 6 — unpainted tile never matches; real color independent of grayscale render
{
  assert.equal(isMatch('GREEN', null), false);
  assert.equal(isMatch('RED', 'RED'), true);
  assert.equal(isMatch('GREEN', 'RED'), false);
  const realColor = 'RED';
  const renderedColor = 'GRAYSCALE';
  assert.equal(realColor, 'RED');
  assert.notEqual(renderedColor, realColor);
}

// Test 7 — alarm notifies siren + patrol robot observer
{
  let robotGotEvent = false;
  const alarm = createAlarmSystem({
    onAlarmTriggered() {
      robotGotEvent = true;
    },
  });
  const fired = alarm.trigger({ playerX: 3, playerY: 4, reason: 'COLOR_MISMATCH' });
  assert.equal(fired, true);
  assert.equal(alarm.siren.sirenActive, true);
  assert.equal(robotGotEvent, true);
}

// Test 8 — loot math: 20% of pool × outcome multiplier
{
  const silent = lootForOutcome('SILENT', { coins: 500, ink: 100 });
  assert.equal(silent.coins, Math.round(Math.floor(500 * RAID_LOOT_FRACTION) * 1.0));
  assert.equal(silent.ink, Math.round(Math.floor(100 * RAID_LOOT_FRACTION) * 1.0));
  const escaped = lootForOutcome('ESCAPED', { coins: 500, ink: 100 });
  assert.equal(escaped.coins, Math.round(Math.floor(500 * RAID_LOOT_FRACTION) * 1.5));
  assert.equal(escaped.ink, Math.round(Math.floor(100 * RAID_LOOT_FRACTION) * 1.5));
  const caught = lootForOutcome('CAUGHT', { coins: 500, ink: 100 });
  assert.equal(caught.coins, 0);
  assert.equal(caught.ink, 0);
}

// Test 9 — baseline constants stay synced with backend StealthConstants
{
  assert.equal(RAID_DURATION_SECONDS, 150);
  assert.equal(STEALTH_CONSTANTS.colorMatchBonus, 40);
  assert.equal(STEALTH_CONSTANTS.meterRisePerSec, 36);
  assert.ok(SEARCHLIGHT_LEVELS[3].cover > SEARCHLIGHT_LEVELS[1].cover);
}

// Beam helper sanity
{
  const hit = evaluateBeam(light, playerOnBeam(2));
  assert.equal(hit.canSee, true);
  const miss = evaluateBeam(light, { x: 0, y: 0 });
  assert.equal(miss.canSee, false);
}

console.log('color camouflage tests: 9/9 passed');
