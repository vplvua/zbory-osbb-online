import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getBackoffDelayMs, retryPresets } from '@/lib/retry/withRetry';

describe('retry backoff', () => {
  it('calculates exponential backoff delays', () => {
    const backoff = retryPresets.dubidoc.backoff;

    assert.equal(getBackoffDelayMs(backoff, 1), 1_000);
    assert.equal(getBackoffDelayMs(backoff, 2), 2_000);
    assert.equal(getBackoffDelayMs(backoff, 3), 4_000);
  });

  it('calculates linear backoff delays', () => {
    const backoff = retryPresets.turbosms.backoff;

    assert.equal(getBackoffDelayMs(backoff, 1), 5_000);
    assert.equal(getBackoffDelayMs(backoff, 2), 10_000);
    assert.equal(getBackoffDelayMs(backoff, 3), 15_000);
  });

  it('returns zero delay when backoff is not configured', () => {
    assert.equal(getBackoffDelayMs(undefined, 1), 0);
  });
});
