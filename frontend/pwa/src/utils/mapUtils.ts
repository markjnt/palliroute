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
};

export const libraries: ('places' | 'geocoding' | 'geometry')[] = [
  'places',
  'geocoding',
  'geometry',
];

export const containerStyle = {
  width: '100%',
  height: '100%',
};

export const defaultCenter = {
  lat: 51.0267,
  lng: 7.5683,
};

export const defaultZoom = 10;

export const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  clickableIcons: false,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
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

export const createTourAreaMarkerData = (area: string): MarkerData | null => {
  const start = getTourAreaStartLocation(area);
  const position = new google.maps.LatLng(start.lat, start.lng);
  return {
    position,
    title: `AW Tour: ${area}-Bereich`,
    type: 'tour_area',
    area,
    employeeId: null,
    routeId: null,
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
    const start = getTourAreaStartLocation(selectedTourArea);
    bounds.extend(new google.maps.LatLng(start.lat, start.lng));
    hasValidPoints = true;
  }

  if (routes && routes.length > 0) {
    for (const route of routes) {
      const employee = employees.find((e) => e.id === route.employee_id);
      if (employee?.latitude && employee?.longitude) {
        bounds.extend(new google.maps.LatLng(employee.latitude, employee.longitude));
        hasValidPoints = true;
      }

      if (route.route_order) {
        const routeOrder = parseRouteOrder(route.route_order);
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
