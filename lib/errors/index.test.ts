import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyError, CriticalError, PermanentError, TemporaryError } from '@/lib/errors';

describe('integration error classification', () => {
  it('keeps already classified errors', () => {
    const original = new TemporaryError('temporary');
    assert.equal(classifyError(original), original);
  });

  it('classifies timeout errors as temporary', () => {
    const error = new Error('timeout');
    error.name = 'TimeoutError';
    assert.ok(classifyError(error) instanceof TemporaryError);
  });

  it('classifies runtime type errors as critical', () => {
    assert.ok(classifyError(new TypeError('boom')) instanceof CriticalError);
  });

  it('classifies generic errors as permanent', () => {
    assert.ok(classifyError(new Error('invalid payload')) instanceof PermanentError);
  });

  it('classifies non-error throws as critical', () => {
    assert.ok(classifyError('bad throw') instanceof CriticalError);
  });
});
