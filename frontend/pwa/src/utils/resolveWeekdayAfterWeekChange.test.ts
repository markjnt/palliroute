import { describe, expect, it } from 'vitest';
import type { Weekday } from '../types/models';
import {
  resolveWeekdayAfterWeekChange,
  routesReadyForSelectedWeek,
} from './resolveWeekdayAfterWeekChange';
import { getCalendarWeek, getIsoWeekYear, isoYearForCalendarWeek } from '@palliroute/shared';

const weekendAw = (weekday: Weekday) => weekday === 'saturday' || weekday === 'sunday';

describe('resolveWeekdayAfterWeekChange', () => {
  it('keeps a normal weekday', () => {
    expect(
      resolveWeekdayAfterWeekChange({
        selectedWeekday: 'wednesday',
        today: 'wednesday',
        isAwDay: weekendAw,
        hasAssignedAwTour: () => false,
      })
    ).toBe('wednesday');
  });

  it('stays on Saturday when the employee still has that AW tour', () => {
    expect(
      resolveWeekdayAfterWeekChange({
        selectedWeekday: 'saturday',
        today: 'wednesday',
        isAwDay: weekendAw,
        hasAssignedAwTour: (day) => day === 'saturday',
      })
    ).toBe('saturday');
  });

  it('falls back to today when Saturday has no assigned AW tour', () => {
    expect(
      resolveWeekdayAfterWeekChange({
        selectedWeekday: 'saturday',
        today: 'wednesday',
        isAwDay: weekendAw,
        hasAssignedAwTour: () => false,
      })
    ).toBe('wednesday');
  });

  it('skips today when today is also an AW day and picks the nearest non-AW day', () => {
    expect(
      resolveWeekdayAfterWeekChange({
        selectedWeekday: 'saturday',
        today: 'saturday',
        isAwDay: weekendAw,
        hasAssignedAwTour: () => false,
      })
    ).toBe('friday');
  });

  it('prefers the next day over the previous day when both are equally close', () => {
    const isAwDay = (weekday: Weekday) => weekday === 'wednesday';
    expect(
      resolveWeekdayAfterWeekChange({
        selectedWeekday: 'wednesday',
        today: 'wednesday',
        isAwDay,
        hasAssignedAwTour: () => false,
      })
    ).toBe('thursday');
  });

  it('stays inside the KW when today is Sunday', () => {
    expect(
      resolveWeekdayAfterWeekChange({
        selectedWeekday: 'sunday',
        today: 'sunday',
        isAwDay: weekendAw,
        hasAssignedAwTour: () => false,
      })
    ).toBe('friday');
  });

  it('falls back from a weekday without a tour to a day that has one', () => {
    expect(
      resolveWeekdayAfterWeekChange({
        selectedWeekday: 'monday',
        today: 'monday',
        isAwDay: weekendAw,
        hasAssignedAwTour: () => false,
        hasWeekdayTour: (day) => day === 'tuesday' || day === 'wednesday',
      })
    ).toBe('tuesday');
  });

  it('prefers today when today still has a weekday tour', () => {
    expect(
      resolveWeekdayAfterWeekChange({
        selectedWeekday: 'monday',
        today: 'wednesday',
        isAwDay: weekendAw,
        hasAssignedAwTour: () => false,
        hasWeekdayTour: (day) => day === 'wednesday' || day === 'thursday',
      })
    ).toBe('wednesday');
  });
});

describe('routesReadyForSelectedWeek', () => {
  it('is ready once any route belongs to the selected week', () => {
    expect(routesReadyForSelectedWeek([{ calendar_week: 34 }], 34, true)).toBe(true);
  });

  it('waits while cached routes still belong to another week', () => {
    expect(routesReadyForSelectedWeek([{ calendar_week: 33 }], 34, true)).toBe(false);
    expect(routesReadyForSelectedWeek([{ calendar_week: 33 }], 34, false)).toBe(false);
  });

  it('is ready for an empty week after the fetch has settled', () => {
    expect(routesReadyForSelectedWeek([], 34, true)).toBe(false);
    expect(routesReadyForSelectedWeek([], 34, false)).toBe(true);
  });
});

describe('isoYearForCalendarWeek', () => {
  it('maps KW 52 in January to the previous ISO year', () => {
    const wed = new Date(2026, 0, 7);
    expect(getCalendarWeek(wed)).toBe(2);
    expect(getIsoWeekYear(wed)).toBe(2026);
    expect(isoYearForCalendarWeek(52, wed)).toBe(2025);
    expect(isoYearForCalendarWeek(2, wed)).toBe(2026);
  });

  it('maps KW 1 in late December to the next ISO year', () => {
    const monday = new Date(2025, 11, 29);
    expect(getCalendarWeek(monday)).toBe(1);
    expect(getIsoWeekYear(monday)).toBe(2026);
    expect(isoYearForCalendarWeek(1, monday)).toBe(2026);
    expect(isoYearForCalendarWeek(52, monday)).toBe(2025);
  });
});
