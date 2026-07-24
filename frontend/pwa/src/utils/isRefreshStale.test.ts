import { describe, expect, it } from 'vitest';
import { isRefreshStale, TWO_HOURS_MS } from './isRefreshStale';

describe('isRefreshStale', () => {
  const now = new Date('2026-07-24T16:00:00.000Z');

  it('returns false when lastUpdateTime is null', () => {
    expect(isRefreshStale(null, now)).toBe(false);
  });

  it('returns false when last refresh is exactly two hours ago', () => {
    const last = new Date(now.getTime() - TWO_HOURS_MS);
    expect(isRefreshStale(last, now)).toBe(false);
  });

  it('returns false when last refresh is under two hours ago', () => {
    const last = new Date(now.getTime() - TWO_HOURS_MS + 1);
    expect(isRefreshStale(last, now)).toBe(false);
  });

  it('returns true when last refresh is older than two hours', () => {
    const last = new Date(now.getTime() - TWO_HOURS_MS - 1);
    expect(isRefreshStale(last, now)).toBe(true);
  });
});
