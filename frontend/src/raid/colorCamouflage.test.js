import assert from 'node:assert/strict';
import { isMatch } from './ColorMatchSystem.js';
import { evaluateBeam } from './SearchlightSensor.js';
import { evaluateDetectionTick } from './DetectionSystem.js';
import { createRaidSession, rejectColorChange, lootForOutcome, estimateLootPercent } from './RaidSession.js';
import { createAlarmSystem } from './AlarmSystem.js';
import {
  tickExtractionChannel,
  estimateLootAmounts,
  inExtractionZone,
} from './extraction.js';
import {
  STEALTH_CONSTANTS,
  RAID_DURATION_SECONDS,
  SEARCHLIGHT_LEVELS,
  GATE_X,
  GATE_Y,
  CHANNEL_DURATION_SECONDS,
  MAX_LOOT_PERCENT,
  LOOT_PERCENT_PER_INTERVAL,
  RISK_ESCALATION_PER_INTERVAL,
  BEAM_RANGE_START_RATIO,
  BEAM_RANGE_GROWTH_PER_SECOND,
  BEAM_RANGE_MAX_RATIO,
  ROBOT_CHASE_SPEED,
  ROBOT_HIT_SPEED,
  PLAYER_WALK_SPEED,
  effectiveMeterRisePerSec,
  beamRangeRatio,
  effectiveBeamRangeTiles,
} from './stealthConstants.js';
import { PatrolRobotContext, ROBOT_STATES } from '../patrolRobotState.js';

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

// Test 1 — any beam contact spots immediately (camo no longer hides under the cone)
{
  const tick = evaluateDetectionTick({
    light,
    player: playerOnBeam(),
    attackerColor: 'RED',
    tileColor: 'RED',
    dt: 0.25,
  });
  assert.equal(tick.beam.canSee, true);
  assert.equal(tick.exposed, true);
  assert.equal(tick.justAlarmed, true);
  assert.equal(tick.alarmLatched, true);
}

// Test 1b — outside beam stays quiet
{
  const tick = evaluateDetectionTick({
    light,
    player: { x: 0, y: 0 },
    attackerColor: 'RED',
    tileColor: 'BLUE',
    dt: 0.25,
  });
  assert.equal(tick.beam.canSee, false);
  assert.equal(tick.exposed, false);
  assert.equal(tick.justAlarmed, false);
}

// Test 2 — mismatch in beam: instant alarm (no meter ramp)
{
  const tick = evaluateDetectionTick({
    light,
    player: playerOnBeam(),
    attackerColor: 'RED',
    tileColor: 'BLUE',
    dt: 0.016,
  });
  assert.equal(tick.colorMatch, false);
  assert.equal(tick.exposed, true);
  assert.equal(tick.justAlarmed, true);
  assert.equal(tick.alarmLatched, true);
  assert.equal(tick.meter, STEALTH_CONSTANTS.alarmAt);
}

// Test 3 — risk escalation constant sync; leaving the beam decays meter when not latched
{
  assert.equal(effectiveMeterRisePerSec(0), STEALTH_CONSTANTS.meterRisePerSec);
  assert.equal(effectiveMeterRisePerSec(30), STEALTH_CONSTANTS.meterRisePerSec + RISK_ESCALATION_PER_INTERVAL);
  const offBeam = evaluateDetectionTick({
    light,
    player: { x: 0, y: 0 },
    attackerColor: 'RED',
    tileColor: 'BLUE',
    dt: 1,
    meter: 40,
    elapsedSeconds: 30,
  });
  assert.ok(offBeam.meter < 40);
  assert.equal(offBeam.justAlarmed, false);
}

// Test 4 — raid session locks camo
{
  const raid = createRaidSession({ attackerId: 1, defenderId: 2, camoColor: 'BLUE' });
  assert.equal(raid.camoColor, 'BLUE');
  const reject = rejectColorChange(raid, 'RED');
  assert.equal(reject.ok, false);
}

// Test 5 — greed loot percent + outcome multipliers
{
  assert.equal(estimateLootPercent(0), 0);
  assert.ok(estimateLootPercent(5) > 0, 'greed accrues before first 10s tick');
  assert.equal(estimateLootPercent(10), LOOT_PERCENT_PER_INTERVAL);
  assert.equal(estimateLootPercent(40), 0.2);
  assert.equal(estimateLootPercent(999), MAX_LOOT_PERCENT);

  const silent = lootForOutcome('SILENT', { coins: 500, ink: 100, elapsedSeconds: 40 });
  assert.equal(silent.coins, 100);
  assert.equal(silent.ink, 20);
  const escaped = lootForOutcome('ESCAPED', { coins: 500, ink: 100, elapsedSeconds: 40 });
  assert.equal(escaped.coins, 150);
  assert.equal(escaped.ink, 30);
  const caught = lootForOutcome('CAUGHT', { coins: 500, ink: 100, elapsedSeconds: 40 });
  assert.equal(caught.coins, 0);
  assert.equal(caught.ink, 0);
  const incomplete = estimateLootAmounts(40, { coins: 500, ink: 100 }, 'INCOMPLETE');
  assert.equal(incomplete.coins, 0);
}

// Test 6 — extraction channel completes when held still at gate
{
  assert.equal(inExtractionZone(GATE_X, GATE_Y), true);
  let progress = 0;
  let complete = false;
  for (let i = 0; i < 300 && !complete; i++) {
    const r = tickExtractionChannel({
      channelProgress: progress,
      x: GATE_X,
      y: GATE_Y,
      prevX: GATE_X,
      prevY: GATE_Y,
      dt: 1 / 60,
      beamHit: false,
    });
    progress = r.channelProgress;
    complete = r.complete;
  }
  assert.equal(complete, true);
  assert.ok(progress >= CHANNEL_DURATION_SECONDS);
}

// Test 7 — movement interrupts channel
{
  let progress = 2;
  const r = tickExtractionChannel({
    channelProgress: progress,
    x: GATE_X,
    y: GATE_Y,
    prevX: GATE_X + 1,
    prevY: GATE_Y,
    dt: 1 / 60,
  });
  assert.equal(r.channelProgress, 0);
  assert.equal(r.interrupted, true);
}

// Test 8 — beam hit interrupts channel
{
  const r = tickExtractionChannel({
    channelProgress: 1.5,
    x: GATE_X,
    y: GATE_Y,
    prevX: GATE_X,
    prevY: GATE_Y,
    dt: 1 / 60,
    beamHit: true,
  });
  assert.equal(r.channelProgress, 0);
  assert.equal(r.interrupted, true);
}

// Test 9 — difficulty constants synced with backend
{
  assert.equal(RAID_DURATION_SECONDS, 150);
  assert.equal(STEALTH_CONSTANTS.colorMatchBonus, 34);
  assert.equal(STEALTH_CONSTANTS.meterRisePerSec, 41);
  assert.equal(STEALTH_CONSTANTS.meterFallPerSec, 15);
  assert.ok(SEARCHLIGHT_LEVELS[3].alarmSweepMult > SEARCHLIGHT_LEVELS[1].alarmSweepMult);
}

// Beam helper sanity
{
  const hit = evaluateBeam(light, playerOnBeam(2));
  assert.equal(hit.canSee, true);
  const miss = evaluateBeam(light, { x: 0, y: 0 });
  assert.equal(miss.canSee, false);
}

// Beam range growth — per-second formula (mirrors backend StealthConstants.beamRangeRatio)
{
  const configured = 4.6;
  assert.equal(beamRangeRatio(0), BEAM_RANGE_START_RATIO);
  assert.equal(effectiveBeamRangeTiles(configured, 0), BEAM_RANGE_START_RATIO * configured);
  const at10 = BEAM_RANGE_START_RATIO + 10 * BEAM_RANGE_GROWTH_PER_SECOND;
  assert.equal(beamRangeRatio(10), at10);
  assert.equal(effectiveBeamRangeTiles(configured, 10), at10 * configured);
  assert.equal(beamRangeRatio(999), BEAM_RANGE_MAX_RATIO);
  assert.equal(effectiveBeamRangeTiles(configured, 999), BEAM_RANGE_MAX_RATIO * configured);
  // Alarm bonus additive (not ratio-scaled)
  assert.equal(effectiveBeamRangeTiles(configured, 10, 1.6), at10 * configured + 1.6);

  // Outside start range at t=0, inside after continuous growth (~75s to full)
  const pastStart = configured * 0.95;
  const early = evaluateBeam(
    { ...light, coneRangeTiles: effectiveBeamRangeTiles(configured, 0) },
    { x: light.x, y: light.y + pastStart }
  );
  assert.equal(early.canSee, false);
  const late = evaluateBeam(
    { ...light, coneRangeTiles: effectiveBeamRangeTiles(configured, 40) },
    { x: light.x, y: light.y + pastStart }
  );
  assert.equal(late.canSee, true);
}

// Instant chase on CORE_ZONE — no ALERT dwell
{
  const robot = new PatrolRobotContext();
  robot.processDetection({ reason: 'CORE_ZONE', playerX: 6, playerY: 5 });
  assert.equal(robot.state, ROBOT_STATES.CHASING);
  assert.equal(robot.lastSeenPlayerX, 6);
}

// Robot chase slightly above walk so it can close map-wide; sprint still escapes
{
  assert.ok(ROBOT_CHASE_SPEED > PLAYER_WALK_SPEED);
  assert.equal(ROBOT_CHASE_SPEED, 3.95);
  assert.equal(ROBOT_HIT_SPEED, 4.15);
}

console.log('color camouflage / extraction / loot tests passed');
