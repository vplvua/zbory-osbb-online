import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ProtocolType } from '@prisma/client';
import { calculateSheetExpiresAt, getSheetValidityDays } from '@/lib/sheet/expiry';

describe('sheet expiry helpers', () => {
  it('returns validity window by protocol type', () => {
    assert.equal(getSheetValidityDays(ProtocolType.ESTABLISHMENT), 15);
    assert.equal(getSheetValidityDays(ProtocolType.GENERAL), 45);
  });

  it('calculates expiresAt at end of day', () => {
    const protocolDate = new Date('2026-02-01T10:20:30.000Z');
    const expiresAt = calculateSheetExpiresAt(protocolDate, ProtocolType.GENERAL);

    assert.equal(expiresAt.toISOString(), '2026-03-18T23:59:59.999Z');
  });
});
