import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Appointment, Weekday } from '../../types/models';
import { appointmentsApi } from '../api/appointments';
import { liveListQueryOptions, routeKeys } from './useRoutes';
import { patientKeys } from './usePatients';

// Keys für React Query Cache
export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (filters: string) => [...appointmentKeys.lists(), { filters }] as const,
  byWeekday: (weekday: Weekday) => [...appointmentKeys.lists(), { weekday }] as const,
  byPatient: (patientId: number) => [...appointmentKeys.lists(), { patientId }] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: number) => [...appointmentKeys.details(), id] as const,
};

// Hook zum Laden aller Termine
export const useAppointments = () => {
  return useQuery({
    queryKey: appointmentKeys.lists(),
    queryFn: () => appointmentsApi.getAll(),
  });
};

// Hook zum Laden von Terminen für einen bestimmten Wochentag
export const useAppointmentsByWeekday = (weekday: Weekday) => {
  return useQuery({
    queryKey: appointmentKeys.byWeekday(weekday),
    queryFn: () => appointmentsApi.getByWeekday(weekday),
    enabled: !!weekday,
    ...liveListQueryOptions,
  });
};

// Hook zum Laden von Terminen für einen bestimmten Patienten
export const useAppointmentsByPatient = (patientId: number) => {
  return useQuery({
    queryKey: appointmentKeys.byPatient(patientId),
    queryFn: () => appointmentsApi.getByPatientId(patientId),
    enabled: !!patientId, // Nur ausführen, wenn eine Patienten-ID angegeben ist
  });
};

// Hook zum Laden eines einzelnen Termins
export const useAppointment = (id: number) => {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => appointmentsApi.getById(id),
    enabled: !!id, // Nur ausführen, wenn eine ID angegeben ist
  });
};

/** Toggle/set completed on an appointment (persisted by appointment id). */
export const useSetAppointmentCompleted = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, completed }: { appointmentId: number; completed: boolean }) =>
      appointmentsApi.setCompleted(appointmentId, completed),
    onMutate: async ({ appointmentId, completed }) => {
      await queryClient.cancelQueries({ queryKey: appointmentKeys.all });

      const previousLists = queryClient.getQueriesData<Appointment[]>({
        queryKey: appointmentKeys.lists(),
      });

      previousLists.forEach(([queryKey, appointments]) => {
        if (!appointments) return;
        queryClient.setQueryData<Appointment[]>(
          queryKey,
          appointments.map((appointment) =>
            appointment.id === appointmentId ? { ...appointment, completed } : appointment
          )
        );
      });

      return { previousLists };
    },
    onError: (_error, _variables, context) => {
      context?.previousLists.forEach(([queryKey, appointments]) => {
        queryClient.setQueryData(queryKey, appointments);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
};

// Hook zum Verschieben eines einzelnen Termins
export const useMoveAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      sourceEmployeeId,
      targetEmployeeId,
      sourceArea,
      targetArea,
    }: {
      appointmentId: number;
      sourceEmployeeId?: number;
      targetEmployeeId?: number;
      sourceArea?: string;
      targetArea?: string;
    }) =>
      appointmentsApi.moveAppointment(
        appointmentId,
        sourceEmployeeId,
        targetEmployeeId,
        sourceArea,
        targetArea
      ),
    onSuccess: () => {
      // Invalidate all appointment queries to refetch data
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.invalidateQueries({ queryKey: routeKeys.all });
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
  });
};

// Hook zum Verschieben aller Termine eines Mitarbeiters
export const useBatchMoveAppointments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sourceEmployeeId,
      targetEmployeeId,
    }: {
      sourceEmployeeId: number;
      targetEmployeeId: number;
    }) => appointmentsApi.batchMoveAppointments(sourceEmployeeId, targetEmployeeId),
    onSuccess: () => {
      // Invalidate all appointment queries to refetch data
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.invalidateQueries({ queryKey: routeKeys.all });
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
  });
};
