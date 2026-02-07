import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getCountdownParts,
  getRemainingMs,
  getRemainingProgressPercent,
  getTimerLevel,
} from '@/lib/vote/timer';

describe('vote timer utils', () => {
  it('computes remaining milliseconds with floor at zero', () => {
    const expiresAt = new Date('2026-02-10T12:00:00.000Z');

    assert.equal(getRemainingMs(expiresAt, new Date('2026-02-10T11:59:59.000Z')), 1000);
    assert.equal(getRemainingMs(expiresAt, new Date('2026-02-10T12:00:00.000Z')), 0);
    assert.equal(getRemainingMs(expiresAt, new Date('2026-02-10T12:00:01.000Z')), 0);
  });

  it('splits remaining duration into days/hours/minutes/seconds', () => {
    const parts = getCountdownParts((((2 * 24 + 3) * 60 + 4) * 60 + 5) * 1000);

    assert.equal(parts.days, 2);
    assert.equal(parts.hours, 3);
    assert.equal(parts.minutes, 4);
    assert.equal(parts.seconds, 5);
  });

  it('returns timer level by PRD thresholds', () => {
    const dayMs = 24 * 60 * 60 * 1000;

    assert.equal(getTimerLevel(0), 'gray');
    assert.equal(getTimerLevel(2 * dayMs), 'red');
    assert.equal(getTimerLevel(3 * dayMs), 'yellow');
    assert.equal(getTimerLevel(7 * dayMs), 'yellow');
    assert.equal(getTimerLevel(7 * dayMs + 1), 'green');
  });

  it('computes remaining progress percent across window', () => {
    const startAt = new Date('2026-02-01T00:00:00.000Z');
    const expiresAt = new Date('2026-02-11T00:00:00.000Z');

    assert.equal(
      getRemainingProgressPercent(startAt, expiresAt, new Date('2026-01-31T00:00:00.000Z')),
      100,
    );
    assert.equal(
      getRemainingProgressPercent(startAt, expiresAt, new Date('2026-02-06T00:00:00.000Z')),
      50,
    );
    assert.equal(
      getRemainingProgressPercent(startAt, expiresAt, new Date('2026-02-11T00:00:00.000Z')),
      0,
    );
  });

  it('returns 0 progress when window is invalid', () => {
    const time = new Date('2026-02-01T00:00:00.000Z');
    assert.equal(getRemainingProgressPercent(time, time, time), 0);
  });
});
