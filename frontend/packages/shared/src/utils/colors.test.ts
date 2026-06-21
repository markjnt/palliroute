import { describe, expect, it } from 'vitest';
import { getColorForTour } from './colors';

describe('getColorForTour', () => {
  it('returns grey for undefined employee id', () => {
    expect(getColorForTour(undefined)).toBe('#9E9E9E');
  });

  it('returns stable colors for employee ids', () => {
    const first = getColorForTour(1);
    const second = getColorForTour(1);

    expect(first).toBe(second);
    expect(first).not.toBe('#9E9E9E');
  });

  it('wraps employee ids across the palette', () => {
    const color = getColorForTour(999);
    expect(color).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
