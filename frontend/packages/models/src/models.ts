export interface User {
  id: number;
  name: string;
  area: Area;
  created_at: string;
  avatarUrl?: string;
}

export type Area = 'Nordkreis' | 'Südkreis' | 'Nord- und Südkreis';

/** Route area: patient areas or AW tour sub-areas */
export type RouteArea = Area | 'Nord' | 'Mitte' | 'Süd';

export interface UserFormData {
  name: string;
  area: Area;
}

export interface Employee {
  id?: number;
  first_name: string;
  last_name: string;
  street: string;
  zip_code: string;
  city: string;
  latitude?: number;
  longitude?: number;
  function: string;
  work_hours: number;
  area: Area;
  alias?: string;
  email?: string | null;
  entra_oid?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type EmployeeFormData = Omit<Employee, 'id' | 'created_at' | 'updated_at'>;

export interface EmployeeImportResponse {
  message: string;
  summary: {
    total_processed: number;
    added: number;
    updated: number;
    removed: number;
  };
  added_employees: Employee[];
  updated_employees: Employee[];
  removed_employees?: Employee[];
}

export type VisitType = 'HB' | 'NA' | 'TK';
export type Weekday =
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface Appointment {
  id?: number;
  patient_id: number;
  employee_id?: number;
  origin_employee_id?: number;
  tour_employee_id?: number;
  weekday: Weekday;
  time?: string;
  visit_type: VisitType;
  duration: number;
  info?: string;
  area: Area;
  calendar_week?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Patient {
  id?: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  street: string;
  zip_code: string;
  city: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone1?: string;
  phone2?: string;
  calendar_week?: number;
  area?: string;
  created_at?: string;
  updated_at?: string;
  appointments?: Appointment[];
}

export interface PatientImportResponse {
  message: string;
  patients: Patient[];
  appointments: Appointment[];
  calendar_week?: number;
  calendar_weeks?: number[];
  calendar_weeks_str?: string;
  last_import_time?: string;
}

export interface Route {
  id: number;
  employee_id: number | null;
  weekday: string;
  route_order: number[];
  total_duration: number;
  total_distance: number;
  polyline: string;
  custom_order: number[];
  custom_order_active: boolean;
  custom_polyline?: string | null;
  custom_distance?: number | null;
  custom_duration?: number | null;
  area: RouteArea | string;
  calendar_week?: number;
  created_at: string;
  updated_at: string;
}
