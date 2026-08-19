import { useCallback } from 'react';
import { Weekday } from '../types/models';
import { useOptimizeRoutes, useOptimizeTourAreaRoutes } from '../services/queries/useRoutes';
import { useNotificationStore } from '../stores/useNotificationStore';

interface UseRouteManagementProps {
  selectedDay: Weekday;
  employeeId?: number;
  area?: string;
}

interface RouteManagementReturn {
  optimizeRoute: () => Promise<void>;
  optimizeTourAreaRoute: () => Promise<void>;
  isOptimizing: boolean;
}

export const useRouteManagement = ({
  selectedDay,
  employeeId,
  area,
}: UseRouteManagementProps): RouteManagementReturn => {
  const { setNotification, setLoading, resetLoading } = useNotificationStore();
  const optimizeRoutes = useOptimizeRoutes();
  const optimizeTourAreaRoutes = useOptimizeTourAreaRoutes();

  const optimizeRoute = useCallback(async () => {
    if (!employeeId) {
      setNotification('Kein Mitarbeiter ausgewählt', 'error');
      return;
    }

    try {
      setLoading('Route wird optimiert...');
      await optimizeRoutes.mutateAsync({
        weekday: selectedDay.toLowerCase(),
        employeeId,
      });
      setNotification('Route erfolgreich optimiert', 'success');
    } catch (error) {
      console.error('Fehler beim Optimieren der Route:', error);
      setNotification('Fehler beim Optimieren der Route', 'error');
    } finally {
      resetLoading();
    }
  }, [employeeId, selectedDay, optimizeRoutes, setNotification, setLoading, resetLoading]);

  const optimizeTourAreaRoute = useCallback(async () => {
    if (!area) {
      setNotification('Kein Bereich ausgewählt', 'error');
      return;
    }

    try {
      setLoading('AW-Tour wird optimiert...');
      await optimizeTourAreaRoutes.mutateAsync({
        weekday: selectedDay.toLowerCase(),
        area,
      });
      setNotification('Route erfolgreich optimiert', 'success');
    } catch (error) {
      console.error('Fehler beim Optimieren der AW-Flächenroute:', error);
      setNotification('Fehler beim Optimieren der Route', 'error');
    } finally {
      resetLoading();
    }
  }, [area, selectedDay, optimizeTourAreaRoutes, setNotification, setLoading, resetLoading]);

  return {
    optimizeRoute,
    optimizeTourAreaRoute,
    isOptimizing: optimizeRoutes.isPending || optimizeTourAreaRoutes.isPending,
  };
};
