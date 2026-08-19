import { describe, expect, it } from 'vitest';
import type { Weekday } from '../types/models';
import { resolveWeekdayAfterWeekChange } from './resolveWeekdayAfterWeekChange';

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
});
