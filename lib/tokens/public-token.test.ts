import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  generatePublicToken,
  hashToken,
  isValidPublicToken,
  PUBLIC_TOKEN_MIN_LENGTH,
} from '@/lib/tokens/public-token';

describe('public token utilities', () => {
  it('generates token with required length and charset', () => {
    const token = generatePublicToken();

    assert.ok(token.length >= PUBLIC_TOKEN_MIN_LENGTH);
    assert.equal(isValidPublicToken(token), true);
  });

  it('rejects invalid tokens', () => {
    assert.equal(isValidPublicToken('short-token'), false);
    assert.equal(isValidPublicToken('a'.repeat(PUBLIC_TOKEN_MIN_LENGTH - 1)), false);
    assert.equal(isValidPublicToken('a'.repeat(PUBLIC_TOKEN_MIN_LENGTH - 1) + '='), false);
  });

  it('is collision-safe in probabilistic sample', () => {
    const sampleSize = 10_000;
    const tokens = new Set<string>();

    for (let i = 0; i < sampleSize; i += 1) {
      tokens.add(generatePublicToken());
    }

    assert.equal(tokens.size, sampleSize);
  });

  it('hashes token with stable sha256 hex output', () => {
    const token = generatePublicToken();
    const hash = hashToken(token);

    assert.match(hash, /^[a-f0-9]{64}$/);
    assert.equal(hashToken(token), hash);
  });
});
