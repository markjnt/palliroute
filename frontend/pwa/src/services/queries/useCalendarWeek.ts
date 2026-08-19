import { useQuery } from '@tanstack/react-query';
import { calendarWeekService } from '../api/calendarWeek';
import { patientsApi } from '../api/patients';

// Keys für React Query Cache
export const calendarWeekKeys = {
  all: ['calendarWeek'] as const,
  best: () => [...calendarWeekKeys.all, 'best'] as const,
  list: () => [...calendarWeekKeys.all, 'list'] as const,
};

// Hook zum Laden der besten Kalenderwoche
export const useCalendarWeek = () => {
  return useQuery({
    queryKey: calendarWeekKeys.best(),
    queryFn: () => calendarWeekService.getBestWeek(),
  });
};

export const useCalendarWeeks = () => {
  return useQuery({
    queryKey: calendarWeekKeys.list(),
    queryFn: () => patientsApi.getCalendarWeeks(),
  });
};
