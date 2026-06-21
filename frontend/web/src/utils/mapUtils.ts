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

export const libraries: ("places" | "geocoding" | "geometry")[] = ['places', 'geocoding', 'geometry'];

export const containerStyle = {
    width: '100%',
    height: '100%',
};

export const defaultCenter = {
    lat: 51.0267,
    lng: 7.5683,
};

export const defaultZoom = 10;

export const MAP_MIN_ZOOM = 3;
export const MAP_MAX_ZOOM = 20;

export const mapOptions: google.maps.MapOptions = {
    zoomControl: false,
    mapTypeControl: false,
    scaleControl: true,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    styles: [
        {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
        },
    ],
};

export const createEmployeeMarkerData = (employee: Employee, routeId?: number): MarkerData | null => {
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

export const createPatientMarkerData = (
    patient: Patient,
    appointment: Appointment,
    position?: number,
    routeId?: number
): MarkerData | null => {
    if (patient.latitude && patient.longitude) {
        const position_coords = new google.maps.LatLng(patient.latitude, patient.longitude);
        const label =
            (appointment.visit_type === 'HB' || appointment.visit_type === 'NA') && position
                ? position.toString()
                : undefined;
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
        };
    }
    console.warn(`No coordinates for patient: ${patient.first_name} ${patient.last_name}`);
    return null;
};

export const createTourAreaMarkerData = (area: string, routeId?: number): MarkerData | null => {
    const start = getTourAreaStartLocation(area);
    const position = new google.maps.LatLng(start.lat, start.lng);
    return {
        position,
        title: 'AW-Startpunkt',
        type: 'tour_area',
        area,
        routeId,
    };
};

export const createTourPatientMarkerData = (
    patient: Patient,
    appointment: Appointment,
    area: string,
    position?: number,
    routeId?: number
): MarkerData | null => {
    if (patient.latitude && patient.longitude) {
        const position_coords = new google.maps.LatLng(patient.latitude, patient.longitude);
        const label =
            (appointment.visit_type === 'HB' || appointment.visit_type === 'NA') && position
                ? position.toString()
                : undefined;
        return {
            position: position_coords,
            title: `${patient.first_name} ${patient.last_name} - ${appointment.visit_type} (${area})`,
            type: 'tour_patient',
            label,
            visitType: appointment.visit_type,
            patientId: patient.id,
            appointmentId: appointment.id,
            routePosition: position,
            routeId,
            area,
        };
    }
    console.warn(`No coordinates for tour patient: ${patient.first_name} ${patient.last_name}`);
    return null;
};
