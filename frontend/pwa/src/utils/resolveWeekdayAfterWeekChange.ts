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

function nearestNonAwDay(from: Weekday, isAwDay: (weekday: Weekday) => boolean): Weekday | null {
  const fromIndex = KW_WEEKDAYS.indexOf(from);
  if (fromIndex < 0) return null;

  for (let distance = 1; distance < KW_WEEKDAYS.length; distance += 1) {
    const forwardIndex = fromIndex + distance;
    if (forwardIndex < KW_WEEKDAYS.length && !isAwDay(KW_WEEKDAYS[forwardIndex])) {
      return KW_WEEKDAYS[forwardIndex];
    }
    const backwardIndex = fromIndex - distance;
    if (backwardIndex >= 0 && !isAwDay(KW_WEEKDAYS[backwardIndex])) {
      return KW_WEEKDAYS[backwardIndex];
    }
  }

  return null;
}

/**
 * After a calendar-week change: keep the selected day when it is a normal tour
 * day or the employee still has an assigned AW tour there. Otherwise fall back
 * to today, or to the nearest non-AW day in the same KW (prefer later, then earlier).
 */
export function resolveWeekdayAfterWeekChange({
  selectedWeekday,
  today,
  isAwDay,
  hasAssignedAwTour,
}: {
  selectedWeekday: Weekday;
  today: Weekday;
  isAwDay: (weekday: Weekday) => boolean;
  hasAssignedAwTour: (weekday: Weekday) => boolean;
}): Weekday {
  if (!isAwDay(selectedWeekday) || hasAssignedAwTour(selectedWeekday)) {
    return selectedWeekday;
  }

  if (!isAwDay(today)) {
    return today;
  }

  return nearestNonAwDay(today, isAwDay) ?? selectedWeekday;
}
