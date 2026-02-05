import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRetryAfterSeconds, isRateLimited } from '@/lib/auth/rate-limit';

describe('rate limit helpers', () => {
  it('flags when count reaches limit', () => {
    assert.equal(isRateLimited(2, 3), false);
    assert.equal(isRateLimited(3, 3), true);
    assert.equal(isRateLimited(4, 3), true);
  });

  it('computes retry-after seconds based on oldest attempt', () => {
    const now = new Date('2026-02-05T12:00:00.000Z');
    const oldest = new Date('2026-02-05T11:50:30.000Z');
    const windowMs = 15 * 60 * 1000;

    const retryAfter = getRetryAfterSeconds(now, oldest, windowMs);
    // 9m30s remaining -> 570s
    assert.equal(retryAfter, 570);
  });
});
