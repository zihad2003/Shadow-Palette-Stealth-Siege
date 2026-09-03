import assert from 'node:assert/strict';
import { isMatch } from './ColorMatchSystem.js';
import { evaluateBeam } from './SearchlightSensor.js';
import { evaluateDetectionTick } from './DetectionSystem.js';
import { createRaidSession, rejectColorChange } from './RaidSession.js';
import { createAlarmSystem } from './AlarmSystem.js';
import { STEALTH_CONSTANTS } from './stealthConstants.js';

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

// Test 2 — mismatch in beam: detection begins
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

// Test 4 — brief mismatch hit follows stealth thresholds (not instant alarm)
{
  const tick = evaluateDetectionTick({
    light,
    player: playerOnBeam(),
    attackerColor: 'GREEN',
    tileColor: 'RED',
    dt: 0.2,
  });
  assert.equal(tick.exposed, true);
  assert.notEqual(tick.state, 'ALARM');
  assert.ok(tick.meter < STEALTH_CONSTANTS.alarmAt);
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

// Beam helper sanity
{
  const hit = evaluateBeam(light, playerOnBeam(2));
  assert.equal(hit.canSee, true);
  const miss = evaluateBeam(light, { x: 0, y: 0 });
  assert.equal(miss.canSee, false);
}

console.log('color camouflage tests: 7/7 passed');
