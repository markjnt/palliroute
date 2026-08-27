export type MarkerType =
  'employee' | 'patient' | 'tour_area' | 'tour_patient' | 'custom' | 'pflegeheim';

export interface MarkerData {
  position: google.maps.LatLng;
  title: string;
  label?: string;
  type: MarkerType;
  visitType?: string;
  employeeType?: string;
  patientId?: number;
  appointmentId?: number;
  employeeId?: number | null;
  routePosition?: number;
  displayPosition?: google.maps.LatLng;
  routeId?: number | null;
  isInactive?: boolean;
  routeArea?: string;
  area?: string;
  customAddress?: string;
}

export interface MarkerGroup {
  markers: MarkerData[];
  position: google.maps.LatLng;
  count: number;
}

export interface RoutePathData {
  employeeId: number | null;
  routeId: number;
  routeOrder: number[];
  color: string;
  polyline: string;
  totalDistance: number;
  totalDuration: number;
  employeeName: string;
}
