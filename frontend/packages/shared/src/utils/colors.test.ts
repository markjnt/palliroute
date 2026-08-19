import { describe, expect, it } from 'vitest';
import { getColorForAdditionalTour, getColorForTour, OWN_ROUTE_LINE_COLOR } from './colors';

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

  it('skips colors too close to avoided own-route blue', () => {
    const withoutAvoid = getColorForTour(7);
    const withAvoid = getColorForTour(7, { avoid: [OWN_ROUTE_LINE_COLOR] });

    expect(withAvoid).not.toBe(OWN_ROUTE_LINE_COLOR);
    expect(withAvoid.toLowerCase()).not.toBe(withoutAvoid.toLowerCase());
  });
});

describe('getColorForAdditionalTour', () => {
  it('never matches the own route line color', () => {
    for (let id = 1; id <= 80; id += 1) {
      expect(getColorForAdditionalTour(id).toLowerCase()).not.toBe(
        OWN_ROUTE_LINE_COLOR.toLowerCase()
      );
    }
  });
});
