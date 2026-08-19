import { useCallback, useMemo } from 'react';
import { useCalendarWeekStore } from '../stores/useCalendarWeekStore';
import { useNrwpHolidaysForYears } from '../services/queries/useConfig';
import { holidayNameForCalendarWeekday, isoYearForCalendarWeek } from '@palliroute/shared';
import type { Weekday } from '../types/models';

export function useNrwpHolidayForTourDay(selectedWeekday: Weekday) {
  const { selectedCalendarWeek } = useCalendarWeekStore();
  const currentYear = new Date().getFullYear();
  const holidayYears = useMemo(
    () => [currentYear - 1, currentYear, currentYear + 1],
    [currentYear]
  );
  const { holidayByYmd } = useNrwpHolidaysForYears(holidayYears);

  const holidayName = useMemo(() => {
    if (selectedCalendarWeek == null) return null;
    return holidayNameForCalendarWeekday(
      holidayByYmd,
      isoYearForCalendarWeek(selectedCalendarWeek),
      selectedCalendarWeek,
      selectedWeekday
    );
  }, [selectedCalendarWeek, selectedWeekday, holidayByYmd]);

  const isSaturdayOrSunday = selectedWeekday === 'saturday' || selectedWeekday === 'sunday';
  const isWeekdayHoliday = Boolean(holidayName && !isSaturdayOrSunday);
  const isAreaTourDay = isSaturdayOrSunday || isWeekdayHoliday;

  return { holidayName, isAreaTourDay };
}

export function useNrwpHolidayLookupForSelectedKw() {
  const { selectedCalendarWeek } = useCalendarWeekStore();
  const currentYear = new Date().getFullYear();
  const holidayYears = useMemo(
    () => [currentYear - 1, currentYear, currentYear + 1],
    [currentYear]
  );
  const { holidayByYmd } = useNrwpHolidaysForYears(holidayYears);

  const getHolidayName = useCallback(
    (weekday: Weekday, calendarWeek: number | null = selectedCalendarWeek) => {
      if (calendarWeek == null) return null;
      return holidayNameForCalendarWeekday(
        holidayByYmd,
        isoYearForCalendarWeek(calendarWeek),
        calendarWeek,
        weekday
      );
    },
    [selectedCalendarWeek, holidayByYmd]
  );

  return getHolidayName;
}
