import { MarkerData } from '../types/mapTypes';
import { Route, Employee, Patient, Appointment } from '../types/models';
import {
  weekdayMap,
  getCurrentWeekday,
  parseRouteOrder,
  isValidRoute,
  hasValidRouteOrder,
  getColorForVisitType,
  getColorForEmployeeType,
  getTourAreaStartLocation,
  isAwTourArea,
  GOOGLE_MAPS_MAP_ID,
  GOOGLE_MAPS_LIBRARIES,
  MAP_CONTAINER_STYLE,
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
} from '@palliroute/shared';

export {
  weekdayMap,
  getCurrentWeekday,
  parseRouteOrder,
  isValidRoute,
  hasValidRouteOrder,
  getColorForVisitType,
  getColorForEmployeeType,
  getTourAreaStartLocation,
  isAwTourArea,
  GOOGLE_MAPS_MAP_ID,
};

export function findEmployeeDayRoute(
  routes: Route[],
  employeeId: number | null | undefined,
  weekday: string,
  isAwDay: boolean
): Route | undefined {
  if (!employeeId) return undefined;
  return routes.find((route) => {
    if (route.weekday !== weekday || route.employee_id !== employeeId) return false;
    return isAwDay ? isAwTourArea(route.area) : !isAwTourArea(route.area);
  });
}

export const AW_TOUR_AREAS = ['Nord', 'Mitte', 'Süd'] as const;

export function findAwAreaRoute(routes: Route[], area: string, weekday: string): Route | undefined {
  return routes.find(
    (route) => route.weekday === weekday && route.area === area && isAwTourArea(route.area)
  );
}

export const libraries = GOOGLE_MAPS_LIBRARIES;
export const containerStyle = MAP_CONTAINER_STYLE;
export const defaultCenter = MAP_DEFAULT_CENTER;
export const defaultZoom = MAP_DEFAULT_ZOOM;

export const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  clickableIcons: false,
  mapId: GOOGLE_MAPS_MAP_ID,
};

export const createEmployeeMarkerData = (
  employee: Employee,
  routeId?: number
): MarkerData | null => {
  if (employee.latitude && employee.longitude) {
    const position = new google.maps.LatLng(employee.latitude, employee.longitude);
    return {
      position,
      title: `${employee.first_name} ${employee.last_name} - ${employee.function || 'Mitarbeiter'}`,
      type: 'employee',
      employeeType: employee.function,
      employeeId: employee.id,
      routeId,
    };
  }
  console.warn(`No coordinates for employee: ${employee.first_name} ${employee.last_name}`);
  return null;
};

export const createTourAreaMarkerData = (
  area: string,
  routeId?: number | null
): MarkerData | null => {
  const start = getTourAreaStartLocation(area);
  const position = new google.maps.LatLng(start.lat, start.lng);
  return {
    position,
    title: `AW Tour: ${area}-Bereich`,
    type: 'tour_area',
    area,
    employeeId: null,
    routeId: routeId ?? null,
  };
};

export const createPatientMarkerData = (
  patient: Patient,
  appointment: Appointment,
  position?: number,
  routeId?: number,
  route?: Route
): MarkerData | null => {
  if (patient.latitude && patient.longitude) {
    const position_coords = new google.maps.LatLng(patient.latitude, patient.longitude);
    const label = position ? position.toString() : undefined;
    return {
      position: position_coords,
      title: `${patient.first_name} ${patient.last_name} - ${appointment.visit_type}`,
      type: 'patient',
      label,
      visitType: appointment.visit_type,
      patientId: patient.id,
      appointmentId: appointment.id,
      routePosition: position,
      routeId,
      area: route?.area as string | undefined,
    };
  }
  console.warn(`No coordinates for patient: ${patient.first_name} ${patient.last_name}`);
  return null;
};

export const calculateRouteBounds = (
  routes: Route[],
  employees: Employee[],
  patients: Patient[],
  appointments: Appointment[],
  selectedTourArea?: string | null
): google.maps.LatLngBounds | null => {
  const bounds = new google.maps.LatLngBounds();
  let hasValidPoints = false;

  if (selectedTourArea) {
    const areaRoute = routes.find((r) => r.area === selectedTourArea);
    const assignedEmployee = areaRoute?.employee_id
      ? employees.find((e) => e.id === areaRoute.employee_id)
      : undefined;
    if (assignedEmployee?.latitude && assignedEmployee?.longitude) {
      bounds.extend(new google.maps.LatLng(assignedEmployee.latitude, assignedEmployee.longitude));
    } else {
      const start = getTourAreaStartLocation(selectedTourArea);
      bounds.extend(new google.maps.LatLng(start.lat, start.lng));
    }
    hasValidPoints = true;
  }

  if (routes && routes.length > 0) {
    for (const route of routes) {
      const employee = employees.find((e) => e.id === route.employee_id);
      if (employee?.latitude && employee?.longitude) {
        bounds.extend(new google.maps.LatLng(employee.latitude, employee.longitude));
        hasValidPoints = true;
      }

      if (route.route_order || route.custom_order) {
        const routeOrder = [
          ...parseRouteOrder(route.route_order),
          ...parseRouteOrder(route.custom_order),
        ];
        for (const appointmentId of routeOrder) {
          const appointment = appointments.find((a) => a.id === appointmentId);
          if (appointment) {
            const patient = patients.find((p) => p.id === appointment.patient_id);
            if (patient?.latitude && patient?.longitude) {
              bounds.extend(new google.maps.LatLng(patient.latitude, patient.longitude));
              hasValidPoints = true;
            }
          }
        }
      }
    }
  }

  return hasValidPoints ? bounds : null;
};
