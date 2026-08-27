import { useCallback, useMemo } from "react";
import { useCalendarWeekStore } from "../stores";
import { useNrwpHolidaysForYears } from "../services/queries/useConfig";
import {
  holidayNameForCalendarWeekday,
  isoYearForCalendarWeek,
} from "@palliroute/shared";
import type { Weekday } from "../types/models";

/**
 * NRW public holiday for the tour planning selection (KW + weekday), aligned with backend ISO-week logic.
 * `isAreaTourDay` is true for Sa/So or for Mo–Fr on a public holiday (AW / Touren-Fläche wie Wochenende).
 */
export function useNrwpHolidayForTourDay(selectedWeekday: Weekday) {
  const { selectedCalendarWeek } = useCalendarWeekStore();
  const currentYear = new Date().getFullYear();
  const holidayYears = useMemo(
    () => [currentYear - 1, currentYear, currentYear + 1],
    [currentYear],
  );
  const { holidayByYmd } = useNrwpHolidaysForYears(holidayYears);

  const holidayName = useMemo(() => {
    if (selectedCalendarWeek == null) return null;
    return holidayNameForCalendarWeekday(
      holidayByYmd,
      isoYearForCalendarWeek(selectedCalendarWeek),
      selectedCalendarWeek,
      selectedWeekday,
    );
  }, [selectedCalendarWeek, selectedWeekday, holidayByYmd]);

  const isWeekendDay =
    selectedWeekday === "saturday" || selectedWeekday === "sunday";
  const isWeekdayHoliday = Boolean(holidayName && !isWeekendDay);
  const isAreaTourDay = isWeekendDay || isWeekdayHoliday;

  return { holidayName, isAreaTourDay };
}

/** Feiertagsname pro engl. Wochentag für die aktuell gewählte KW (Touren-Dropdown). */
export function useNrwpHolidayLookupForSelectedKw() {
  const { selectedCalendarWeek } = useCalendarWeekStore();
  const currentYear = new Date().getFullYear();
  const holidayYears = useMemo(
    () => [currentYear - 1, currentYear, currentYear + 1],
    [currentYear],
  );
  const { holidayByYmd } = useNrwpHolidaysForYears(holidayYears);

  const getHolidayName = useCallback(
    (weekday: Weekday) => {
      if (selectedCalendarWeek == null) return null;
      return holidayNameForCalendarWeekday(
        holidayByYmd,
        isoYearForCalendarWeek(selectedCalendarWeek),
        selectedCalendarWeek,
        weekday,
      );
    },
    [selectedCalendarWeek, holidayByYmd],
  );

  return getHolidayName;
}
