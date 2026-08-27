export * from "@palliroute/models";

export interface Pflegeheim {
  id: number;
  name: string;
  street: string;
  zip_code: string;
  city: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PflegeheimImportResponse {
  message: string;
  summary: {
    total_processed: number;
    added: number;
    updated: number;
    removed: number;
  };
  added_pflegeheime: Pflegeheim[];
  updated_pflegeheime: Pflegeheim[];
  removed_pflegeheime: Pflegeheim[];
}

export type DutyType =
  | "rb_nursing_weekday"
  | "rb_nursing_weekend_day"
  | "rb_nursing_weekend_night"
  | "rb_doctors_weekday"
  | "rb_doctors_weekend"
  | "aw_nursing";

export type OnCallArea = "Nord" | "Süd" | "Mitte";

export type ShiftCategory = "RB_WEEKDAY" | "RB_WEEKEND" | "AW";
export type ShiftRole = "NURSING" | "DOCTOR";
export type ShiftTimeOfDay = "DAY" | "NIGHT" | "NONE";
export type ShiftArea = "Nord" | "Süd" | "Mitte";
export type CapacityType =
  | "RB_NURSING_WEEKDAY"
  | "RB_NURSING_WEEKEND"
  | "RB_DOCTORS_WEEKDAY"
  | "RB_DOCTORS_WEEKEND"
  | "AW_NURSING";
export type AssignmentSource = "SOLVER" | "MANUAL";

export interface ShiftDefinition {
  id: number;
  category: ShiftCategory;
  role: ShiftRole;
  area: ShiftArea;
  time_of_day: ShiftTimeOfDay;
  is_weekday: boolean;
  is_weekend: boolean;
}

export interface ShiftInstance {
  id: number;
  date: string;
  calendar_week: number;
  month: string;
  shift_definition_id: number;
  shift_definition?: ShiftDefinition;
}

export interface EmployeeCapacity {
  id: number;
  employee_id: number;
  capacity_type: CapacityType;
  max_count: number;
  assigned: number;
  remaining: number;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    function: string;
  };
}

export interface Assignment {
  id: number;
  employee_id: number;
  shift_instance_id: number;
  source: AssignmentSource;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    function: string;
    area: import("@palliroute/models").Area;
  };
  shift_instance?: ShiftInstance;
  shift_definition?: ShiftDefinition;
}
