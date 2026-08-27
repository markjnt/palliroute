import type { Weekday } from '../types/models';

export const KW_WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export function isAwCalendarDay(weekday: Weekday, holidayName: string | null | undefined): boolean {
  return weekday === 'saturday' || weekday === 'sunday' || Boolean(holidayName);
}

function nearestMatching(from: Weekday, isMatch: (weekday: Weekday) => boolean): Weekday | null {
  const fromIndex = KW_WEEKDAYS.indexOf(from);
  if (fromIndex < 0) return null;

  for (let distance = 1; distance < KW_WEEKDAYS.length; distance += 1) {
    const forwardIndex = fromIndex + distance;
    if (forwardIndex < KW_WEEKDAYS.length && isMatch(KW_WEEKDAYS[forwardIndex])) {
      return KW_WEEKDAYS[forwardIndex];
    }
    const backwardIndex = fromIndex - distance;
    if (backwardIndex >= 0 && isMatch(KW_WEEKDAYS[backwardIndex])) {
      return KW_WEEKDAYS[backwardIndex];
    }
  }

  return null;
}

/**
 * Keep the selected day when the employee has a tour there (weekday route or
 * assigned AW). Otherwise fall back to today, then to the nearest day that
 * still has a tour, then to the nearest non-AW day in the same KW.
 */
export function resolveWeekdayAfterWeekChange({
  selectedWeekday,
  today,
  isAwDay,
  hasAssignedAwTour,
  hasWeekdayTour,
}: {
  selectedWeekday: Weekday;
  today: Weekday;
  isAwDay: (weekday: Weekday) => boolean;
  hasAssignedAwTour: (weekday: Weekday) => boolean;
  hasWeekdayTour?: (weekday: Weekday) => boolean;
}): Weekday {
  const isAvailable = (day: Weekday) =>
    isAwDay(day) ? hasAssignedAwTour(day) : (hasWeekdayTour?.(day) ?? true);

  if (isAvailable(selectedWeekday)) {
    return selectedWeekday;
  }

  if (isAvailable(today)) {
    return today;
  }

  return (
    nearestMatching(today, isAvailable) ??
    nearestMatching(today, (day) => !isAwDay(day)) ??
    selectedWeekday
  );
}

/** True when cached routes belong to `week` (or the fetch for that week has settled). */
export function routesReadyForSelectedWeek(
  routes: Array<{ calendar_week?: number | null }>,
  week: number,
  isFetching: boolean
): boolean {
  const matchesWeek = routes.some((route) => route.calendar_week === week);
  if (matchesWeek) return true;

  const fromOtherWeeks = routes.some(
    (route) => route.calendar_week != null && route.calendar_week !== week
  );
  if (fromOtherWeeks) {
    return false;
  }

  return !isFetching;
}
