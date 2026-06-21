import type { Appointment, Route } from '@palliroute/models';
import { appointmentTypeColors, employeeTypeColors } from '../colors';

export const weekdayMap: Record<string, string> = {
    monday: 'Montag',
    tuesday: 'Dienstag',
    wednesday: 'Mittwoch',
    thursday: 'Donnerstag',
    friday: 'Freitag',
    saturday: 'Samstag',
    sunday: 'Sonntag',
};

export const getCurrentWeekday = (): string => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
};

export const parseRouteOrder = (routeOrder: unknown): number[] => {
    if (Array.isArray(routeOrder)) {
        return routeOrder;
    }
    try {
        const parsed = JSON.parse(routeOrder as string);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Failed to parse route_order:', error);
        return [];
    }
};

export const isValidRoute = (route: Route): boolean => {
    const routeOrder = parseRouteOrder(route.route_order);
    return routeOrder.length > 0;
};

export const hasValidRouteOrder = (
    route: Route,
    appointments: Appointment[],
    selectedWeekday: string
): boolean => {
    const routeOrder = parseRouteOrder(route.route_order);
    if (!routeOrder || routeOrder.length === 0) {
        return false;
    }
    return routeOrder.every((appointmentId) =>
        appointments.some(
            (appointment) =>
                appointment.id === appointmentId && appointment.weekday === selectedWeekday
        )
    );
};

export const getColorForVisitType = (visitType?: string): string => {
    if (!visitType) return appointmentTypeColors.default;
    return appointmentTypeColors[visitType] || appointmentTypeColors.default;
};

export const getColorForEmployeeType = (employeeType?: string): string => {
    if (!employeeType) return employeeTypeColors.default;
    if (employeeType.includes('Arzt') && !employeeType.includes('Honorar')) {
        return employeeTypeColors['Arzt'];
    }
    if (employeeType.includes('Honorararzt')) {
        return employeeTypeColors['Honorararzt'];
    }
    return employeeTypeColors.default;
};

export const getTourAreaStartLocation = (area: string): { lat: number; lng: number } => {
    let areaNormalized = area;
    if (area.includes('Nord') || area === 'Nordkreis') {
        areaNormalized = 'Nord';
    } else if (area.includes('Süd') || area === 'Südkreis') {
        areaNormalized = 'Süd';
    } else if (area.includes('Mitte')) {
        areaNormalized = 'Mitte';
    }

    const tourAreaStartLocations: Record<string, { lat: number; lng: number }> = {
        Mitte: { lat: 50.9833022, lng: 7.5412243 },
        Nord: { lat: 51.11806869506836, lng: 7.399380207061768 },
        Süd: { lat: 50.8775055, lng: 7.6168993 },
    };

    return tourAreaStartLocations[areaNormalized] || tourAreaStartLocations['Mitte'];
};
