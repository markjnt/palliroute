import { describe, expect, it } from 'vitest';
import { getCalendarWeek, getIsoWeekYear, isoYearForCalendarWeek } from './calendarUtils';

describe('isoYearForCalendarWeek', () => {
  it('keeps the current ISO year for a nearby week', () => {
    const wed = new Date(2026, 0, 7);
    expect(getCalendarWeek(wed)).toBe(2);
    expect(getIsoWeekYear(wed)).toBe(2026);
    expect(isoYearForCalendarWeek(2, wed)).toBe(2026);
  });

  it('maps KW 52 in January to the previous ISO year', () => {
    const wed = new Date(2026, 0, 7);
    expect(isoYearForCalendarWeek(52, wed)).toBe(2025);
  });

  it('maps KW 1 in late December to the next ISO year', () => {
    const monday = new Date(2025, 11, 29);
    expect(getCalendarWeek(monday)).toBe(1);
    expect(getIsoWeekYear(monday)).toBe(2026);
    expect(isoYearForCalendarWeek(1, monday)).toBe(2026);
    expect(isoYearForCalendarWeek(52, monday)).toBe(2025);
  });
});
