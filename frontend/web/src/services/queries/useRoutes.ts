import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Route, Weekday } from '../../types/models';
import { routesApi } from '../api/routes';
import { useCalendarWeekStore } from '../../stores/useCalendarWeekStore';

export const WEB_LIVE_REFETCH_INTERVAL_MS = 60_000;

export const liveListQueryOptions = {
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchOnMount: true,
  refetchInterval: WEB_LIVE_REFETCH_INTERVAL_MS,
  refetchIntervalInBackground: false,
};

// Keys for React Query cache
export const routeKeys = {
  all: ['routes'] as const,
  lists: () => [...routeKeys.all, 'list'] as const,
  list: (filters: any) => [...routeKeys.lists(), { filters }] as const,
  details: () => [...routeKeys.all, 'detail'] as const,
  detail: (id: number) => [...routeKeys.details(), id] as const,
  byDay: () => [...routeKeys.all, 'byDay'] as const,
  forDay: (date: string, employeeId?: number) =>
    [...routeKeys.byDay(), date, { employeeId }] as const,
};

// Hook to get all routes with optional filtering
export const useRoutes = (params?: {
  employee_id?: number;
  weekday?: Weekday;
  date?: string;
  area?: string;
  tour_area_day?: boolean;
  calendar_week?: number;
}) => {
  const { selectedCalendarWeek } = useCalendarWeekStore();

  // Automatisch selectedCalendarWeek verwenden, außer es wird explizit überschrieben
  const finalParams = {
    ...params,
    calendar_week:
      params?.calendar_week !== undefined
        ? params.calendar_week
        : selectedCalendarWeek || undefined,
  };

  return useQuery({
    queryKey: routeKeys.list(finalParams),
    queryFn: () => routesApi.getRoutes(finalParams),
    ...liveListQueryOptions,
  });
};

// Hook to get a single route by ID
export const useRoute = (id: number) => {
  return useQuery({
    queryKey: routeKeys.detail(id),
    queryFn: () => routesApi.getRouteById(id),
    enabled: !!id, // Only run the query if we have an ID
  });
};

// Hook to get routes for a specific day and optionally an employee
export const useRoutesForDay = (date: string, employeeId?: number) => {
  return useQuery({
    queryKey: routeKeys.forDay(date, employeeId),
    queryFn: () => routesApi.getRoutesForDay(date, employeeId),
    enabled: !!date, // Only run the query if we have a date
    ...liveListQueryOptions,
  });
};

// Hook to optimize routes for a specific day
export const useOptimizeRoutes = () => {
  const queryClient = useQueryClient();
  const { selectedCalendarWeek } = useCalendarWeekStore();

  return useMutation({
    mutationFn: ({
      weekday,
      employeeId,
      calendarWeek,
    }: {
      weekday: string;
      employeeId: number;
      calendarWeek?: number;
    }) =>
      routesApi.optimizeRoutes(
        weekday,
        employeeId,
        calendarWeek || selectedCalendarWeek || undefined
      ),
    onSuccess: () => {
      // Invalidate all route queries as they might be affected
      queryClient.invalidateQueries({
        queryKey: routeKeys.byDay(),
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
    },
  });
};

export const useOptimizeTourAreaRoutes = () => {
  const queryClient = useQueryClient();
  const { selectedCalendarWeek } = useCalendarWeekStore();

  return useMutation({
    mutationFn: ({
      weekday,
      area,
      calendarWeek,
    }: {
      weekday: string;
      area: string;
      calendarWeek?: number;
    }) =>
      routesApi.optimizeTourAreaRoutes(
        weekday,
        area,
        calendarWeek || selectedCalendarWeek || undefined
      ),
    onSuccess: () => {
      // Invalidate all route queries as they might be affected
      queryClient.invalidateQueries({
        queryKey: routeKeys.byDay(),
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
    },
  });
};

export const useAssignAwTourEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      routeId,
      employeeId,
      resetToAplano,
    }: {
      routeId: number;
      employeeId: number | null;
      resetToAplano?: boolean;
    }) => routesApi.assignAwTourEmployee(routeId, employeeId, { resetToAplano }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: routeKeys.detail(result.route.id),
      });
      queryClient.invalidateQueries({
        queryKey: routeKeys.lists(),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: routeKeys.byDay(),
        exact: false,
      });
    },
  });
};

// Hook to download route PDF for a calendar week
export const useDownloadRoutePdf = () => {
  return useMutation({
    mutationFn: (args: { calendarWeek: number; selectedWeekday: Weekday }) =>
      routesApi.downloadRoutePdf(args.calendarWeek, args.selectedWeekday),
  });
};
