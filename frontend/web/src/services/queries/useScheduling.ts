import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  schedulingApi,
  AplanoCompareResponse,
  ShiftDefinitionsQueryParams,
  ShiftInstancesQueryParams,
  UnplannedShiftInstancesQueryParams,
  EmployeeCapacitiesQueryParams,
  AssignmentsQueryParams,
  CreateShiftDefinitionData,
  CreateShiftInstanceData,
  GenerateShiftInstancesData,
  CreateAssignmentData,
  UpdateAssignmentData,
  AutoPlanData,
  ResetPlanningData,
} from "../api/scheduling";

// Keys for React Query cache
export const schedulingKeys = {
  all: ["scheduling"] as const,
  shiftDefinitions: {
    all: ["scheduling", "shift-definitions"] as const,
    lists: () => [...schedulingKeys.shiftDefinitions.all, "list"] as const,
    list: (params?: ShiftDefinitionsQueryParams) =>
      [...schedulingKeys.shiftDefinitions.lists(), params] as const,
  },
  shiftInstances: {
    all: ["scheduling", "shift-instances"] as const,
    lists: () => [...schedulingKeys.shiftInstances.all, "list"] as const,
    list: (params?: ShiftInstancesQueryParams) =>
      [...schedulingKeys.shiftInstances.lists(), params] as const,
    unplanned: (params: UnplannedShiftInstancesQueryParams) =>
      [...schedulingKeys.shiftInstances.all, "unplanned", params] as const,
  },
  employeeCapacities: {
    all: ["scheduling", "employee-capacities"] as const,
    lists: () => [...schedulingKeys.employeeCapacities.all, "list"] as const,
    list: (params?: EmployeeCapacitiesQueryParams) =>
      [...schedulingKeys.employeeCapacities.lists(), params] as const,
  },
  assignments: {
    all: ["scheduling", "assignments"] as const,
    lists: () => [...schedulingKeys.assignments.all, "list"] as const,
    list: (params?: AssignmentsQueryParams) =>
      [...schedulingKeys.assignments.lists(), params] as const,
    details: () => [...schedulingKeys.assignments.all, "detail"] as const,
    detail: (id: number) =>
      [...schedulingKeys.assignments.details(), id] as const,
  },
  aplanoCompare: {
    all: ["scheduling", "aplano-compare"] as const,
    month: (month: string) =>
      [...schedulingKeys.aplanoCompare.all, month] as const,
  },
  employeePlanningPreferences: {
    all: ["scheduling", "employee-planning-preferences"] as const,
  },
};

// Shift Definitions hooks
export const useShiftDefinitions = (params?: ShiftDefinitionsQueryParams) => {
  return useQuery({
    queryKey: schedulingKeys.shiftDefinitions.list(params),
    queryFn: () => schedulingApi.getShiftDefinitions(params),
  });
};

export const useCreateShiftDefinition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateShiftDefinitionData) =>
      schedulingApi.createShiftDefinition(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.shiftDefinitions.lists(),
      });
    },
  });
};

// Shift Instances hooks
export const useShiftInstances = (params?: ShiftInstancesQueryParams) => {
  return useQuery({
    queryKey: schedulingKeys.shiftInstances.list(params),
    queryFn: () => schedulingApi.getShiftInstances(params),
  });
};

export const useUnplannedShiftInstances = (
  params: UnplannedShiftInstancesQueryParams | null,
) => {
  return useQuery({
    queryKey: schedulingKeys.shiftInstances.unplanned(params ?? { month: "" }),
    queryFn: () => schedulingApi.getUnplannedShiftInstances(params!),
    enabled: !!params?.month,
  });
};

export const useCreateShiftInstance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateShiftInstanceData) =>
      schedulingApi.createShiftInstance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.shiftInstances.lists(),
      });
    },
  });
};

export const useGenerateShiftInstances = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateShiftInstancesData) =>
      schedulingApi.generateShiftInstances(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.shiftInstances.lists(),
      });
    },
  });
};

// Employee Capacities hooks
export const useEmployeeCapacities = (
  params?: EmployeeCapacitiesQueryParams,
) => {
  return useQuery({
    queryKey: schedulingKeys.employeeCapacities.list(params),
    queryFn: () => schedulingApi.getEmployeeCapacities(params),
  });
};

// Assignments hooks
export const useAssignments = (params?: AssignmentsQueryParams) => {
  return useQuery({
    queryKey: schedulingKeys.assignments.list(params),
    queryFn: () => schedulingApi.getAssignments(params),
  });
};

export const useCreateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssignmentData) =>
      schedulingApi.createAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.assignments.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.employeeCapacities.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.shiftInstances.all,
      }); // unplanned count updates
    },
  });
};

export const useUpdateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAssignmentData }) =>
      schedulingApi.updateAssignment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.assignments.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.employeeCapacities.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.shiftInstances.all,
      }); // unplanned count updates
    },
  });
};

export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => schedulingApi.deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.assignments.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.employeeCapacities.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.shiftInstances.all,
      }); // unplanned count updates
    },
  });
};

// Auto Plan hook
export const useAutoPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AutoPlanData) => schedulingApi.autoPlan(data),
    onSuccess: () => {
      // Invalidate all assignment lists to refetch after planning
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.assignments.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.employeeCapacities.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.shiftInstances.all,
      }); // unplanned count updates
    },
  });
};

// Reset Planning hook
export const useResetPlanning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ResetPlanningData) => schedulingApi.resetPlanning(data),
    onSuccess: () => {
      // Invalidate all assignment lists to refetch after reset
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.assignments.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.employeeCapacities.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.shiftInstances.all,
      }); // unplanned count updates
    },
  });
};

export const useAplanoCompare = (month: string | null) => {
  return useQuery<AplanoCompareResponse>({
    queryKey: schedulingKeys.aplanoCompare.month(month ?? ""),
    queryFn: () => schedulingApi.compareAplanoMonth(month!),
    enabled: !!month,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Keep compare view in sync with external changes in Aplano while dialog is open.
    refetchInterval: month ? 60_000 : false,
    // Continue polling even when tab/window is not focused.
    refetchIntervalInBackground: true,
  });
};

export const useEmployeePlanningPreferences = (enabled = true) => {
  return useQuery({
    queryKey: schedulingKeys.employeePlanningPreferences.all,
    queryFn: () => schedulingApi.getEmployeePlanningPreferences(),
    enabled,
  });
};

export const useUpsertEmployeePlanningPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: schedulingApi.upsertEmployeePlanningPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.employeePlanningPreferences.all,
      });
    },
  });
};
