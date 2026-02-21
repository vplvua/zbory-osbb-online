import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildAnswersSignature,
  hasAnswersChanged,
  isSubmitLockedByExistingSigning,
} from '@/lib/vote/signing-session';

describe('vote signing session helpers', () => {
  it('detects no answer changes when submitted answers match saved answers', () => {
    const changed = hasAnswersChanged(
      [
        { questionId: 'q1', vote: 'FOR' },
        { questionId: 'q2', vote: 'AGAINST' },
      ],
      [
        { questionId: 'q1', vote: 'FOR' },
        { questionId: 'q2', vote: 'AGAINST' },
      ],
    );

    assert.equal(changed, false);
  });

  it('detects changed answers when at least one vote differs', () => {
    const changed = hasAnswersChanged(
      [
        { questionId: 'q1', vote: 'FOR' },
        { questionId: 'q2', vote: 'AGAINST' },
      ],
      [
        { questionId: 'q1', vote: 'AGAINST' },
        { questionId: 'q2', vote: 'AGAINST' },
      ],
    );

    assert.equal(changed, true);
  });

  it('locks submit until user changes answers after signing session is started', () => {
    const initialSignature = buildAnswersSignature([
      { questionId: 'q1', vote: 'FOR' },
      { questionId: 'q2', vote: 'AGAINST' },
    ]);

    assert.equal(isSubmitLockedByExistingSigning(initialSignature, initialSignature), true);

    const updatedSignature = buildAnswersSignature([
      { questionId: 'q1', vote: 'FOR' },
      { questionId: 'q2', vote: 'FOR' },
    ]);

    assert.equal(isSubmitLockedByExistingSigning(initialSignature, updatedSignature), false);
  });
});
