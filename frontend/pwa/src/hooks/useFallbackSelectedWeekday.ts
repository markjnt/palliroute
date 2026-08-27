import { useEffect, useState } from 'react';
import { getCurrentWeekday } from '@palliroute/shared';
import { useCalendarWeekStore } from '../stores/useCalendarWeekStore';
import { useUserStore } from '../stores/useUserStore';
import { useWeekdayStore } from '../stores/useWeekdayStore';
import { useRoutes } from '../services/queries/useRoutes';
import { useNrwpHolidaysForYears } from '../services/queries/useConfig';
import { useNrwpHolidayLookupForSelectedKw } from './useNrwpHolidayForTourDay';
import { findEmployeeDayRoute } from '../utils/mapUtils';
import {
  isAwCalendarDay,
  resolveWeekdayAfterWeekChange,
  routesReadyForSelectedWeek,
} from '../utils/resolveWeekdayAfterWeekChange';
import type { Weekday } from '../types/models';

/**
 * Switch away from a selected day that has no own tour / unassigned AW once
 * routes and holidays are actually loaded — not only when the KW buttons fire.
 */
export function useFallbackSelectedWeekday() {
  const selectedWeekday = useWeekdayStore((state) => state.selectedWeekday);
  const setSelectedWeekday = useWeekdayStore((state) => state.setSelectedWeekday);
  const selectedUserId = useUserStore((state) => state.selectedUserId);
  const selectedCalendarWeek = useCalendarWeekStore((state) => state.selectedCalendarWeek);
  const { data: allRoutes = [], isFetched, isFetching, isError } = useRoutes();
  const getHolidayName = useNrwpHolidayLookupForSelectedKw();
  const holidayYear = new Date().getFullYear();
  const { isFetched: holidaysFetched } = useNrwpHolidaysForYears([
    holidayYear - 1,
    holidayYear,
    holidayYear + 1,
  ]);
  const [weekdayHydrated, setWeekdayHydrated] = useState(() =>
    useWeekdayStore.persist.hasHydrated()
  );

  useEffect(() => {
    if (weekdayHydrated) return;
    return useWeekdayStore.persist.onFinishHydration(() => setWeekdayHydrated(true));
  }, [weekdayHydrated]);

  useEffect(() => {
    if (!weekdayHydrated || !selectedUserId || selectedCalendarWeek == null) return;
    if (!isFetched || isError || !holidaysFetched) return;
    if (!routesReadyForSelectedWeek(allRoutes, selectedCalendarWeek, isFetching)) return;

    const weekRoutes = allRoutes.filter(
      (route) => route.calendar_week == null || route.calendar_week === selectedCalendarWeek
    );
    const nextWeekday = resolveWeekdayAfterWeekChange({
      selectedWeekday,
      today: getCurrentWeekday() as Weekday,
      isAwDay: (day) => isAwCalendarDay(day, getHolidayName(day, selectedCalendarWeek)),
      hasAssignedAwTour: (day) =>
        Boolean(findEmployeeDayRoute(weekRoutes, selectedUserId, day, true)),
    });

    if (nextWeekday !== selectedWeekday) {
      setSelectedWeekday(nextWeekday);
    }
  }, [
    allRoutes,
    getHolidayName,
    holidaysFetched,
    isError,
    isFetched,
    isFetching,
    selectedCalendarWeek,
    selectedUserId,
    selectedWeekday,
    setSelectedWeekday,
    weekdayHydrated,
  ]);
}
