import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { MapContainerProps } from '../../types/mapTypes';
import {
  containerStyle,
  defaultCenter,
  defaultZoom,
  mapOptions,
  libraries,
  GOOGLE_MAPS_MAP_ID,
  createEmployeeMarkerData,
  createPatientMarkerData,
  createTourAreaMarkerData,
  parseRouteOrder,
  calculateRouteBounds,
  findEmployeeDayRoute,
  findAwAreaRoute,
} from '../../utils/mapUtils';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useRoutes } from '../../services/queries/useRoutes';
import { MapMarkers } from './MapMarkers';
import { RoutePolylines } from '@palliroute/ui';
import {
  getColorForAdditionalTour,
  getTourAreaColor,
  getOwnRouteOrder,
  getOwnRoutePolyline,
  getOwnRouteDistance,
  getOwnRouteDuration,
} from '@palliroute/shared';
import { Weekday } from '../../types/models';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { useAdditionalRoutesStore } from '../../stores/useAdditionalRoutesStore';
import { useNrwpHolidayForTourDay } from '../../hooks/useNrwpHolidayForTourDay';

/**
 * Main container component for the map that integrates all map features
 */
export const MapContainer: React.FC<MapContainerProps> = ({ apiKey, onMapClick }) => {
  // Load Google Maps API
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
    mapIds: [GOOGLE_MAPS_MAP_ID],
    language: 'de',
    region: 'DE',
  });

  // Map state
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Get selected user and weekday from stores
  const { selectedUserId } = useUserStore();
  const { selectedWeekday } = useWeekdayStore();
  const { selectedEmployeeIds, selectedAreas } = useAdditionalRoutesStore();
  const { isAreaTourDay } = useNrwpHolidayForTourDay(selectedWeekday as Weekday);

  // Data hooks
  const {
    data: employees = [],
    isLoading: employeesLoading,
    refetch: refetchEmployees,
  } = useEmployees();
  const {
    data: patients = [],
    isLoading: patientsLoading,
    error: patientsError,
    refetch: refetchPatients,
  } = usePatients();
  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    error: appointmentsError,
    refetch: refetchAppointments,
  } = useAppointmentsByWeekday(selectedWeekday as Weekday);
  const {
    data: routes = [],
    isLoading: routesLoading,
    error: routesError,
    refetch: refetchRoutes,
  } = useRoutes({
    weekday: selectedWeekday as Weekday,
  });

  const mainRoute = useMemo(
    () => findEmployeeDayRoute(routes, selectedUserId, selectedWeekday, isAreaTourDay),
    [routes, selectedUserId, selectedWeekday, isAreaTourDay]
  );

  const visibleRoutes = useMemo(() => {
    const additionalRoutes = isAreaTourDay
      ? selectedAreas
          .map((area) => findAwAreaRoute(routes, area, selectedWeekday))
          .filter((route): route is NonNullable<typeof route> =>
            Boolean(route && route.id !== mainRoute?.id)
          )
      : selectedEmployeeIds
          .map((id) => findEmployeeDayRoute(routes, Number(id), selectedWeekday, isAreaTourDay))
          .filter((route): route is NonNullable<typeof route> =>
            Boolean(route && route.id !== mainRoute?.id)
          );

    return [...(mainRoute ? [mainRoute] : []), ...additionalRoutes];
  }, [routes, mainRoute, selectedWeekday, selectedEmployeeIds, selectedAreas, isAreaTourDay]);

  // Marker-Berechnung mit useMemo
  const markers = useMemo(() => {
    if (!isLoaded) return [];
    const newMarkers = [];

    const selectedEmployee = employees.find((e) => e.id === selectedUserId);
    if (selectedEmployee && selectedEmployee.latitude && selectedEmployee.longitude) {
      const route = visibleRoutes.find((r) => r.employee_id === selectedEmployee.id);
      const marker = createEmployeeMarkerData(selectedEmployee, route?.id);
      if (marker) {
        newMarkers.push({ ...marker, isInactive: false });
      }
    }

    if (isAreaTourDay) {
      selectedAreas.forEach((area) => {
        const route = visibleRoutes.find((r) => r.area === area);
        const assignedEmployee = route?.employee_id
          ? employees.find((e) => e.id === route.employee_id)
          : undefined;
        if (assignedEmployee?.latitude && assignedEmployee?.longitude) {
          const marker = createEmployeeMarkerData(assignedEmployee, route?.id);
          if (marker) {
            newMarkers.push({ ...marker, isInactive: false, area });
          }
          return;
        }
        const areaMarker = createTourAreaMarkerData(area, route?.id);
        if (areaMarker) {
          newMarkers.push({ ...areaMarker, isInactive: false });
        }
      });
    } else {
      selectedEmployeeIds.forEach((employeeId) => {
        const employee = employees.find((e) => e.id === Number(employeeId));
        if (employee && employee.latitude && employee.longitude) {
          const route = visibleRoutes.find((r) => r.employee_id === employee.id);
          const marker = createEmployeeMarkerData(employee, route?.id);
          if (marker) {
            newMarkers.push({ ...marker, isInactive: false });
          }
        }
      });
    }

    // Appointments/Patients für alle sichtbaren Routen
    if (patients.length > 0 && appointments.length > 0 && visibleRoutes.length > 0) {
      const appointmentPositions = new Map<number, { position: number; routeId: number }>();

      // Positionen für alle Termine in allen sichtbaren Routen setzen
      visibleRoutes.forEach((route) => {
        const isOwn = mainRoute != null && route.id === mainRoute.id;
        const routeOrder = isOwn ? getOwnRouteOrder(route) : parseRouteOrder(route.route_order);
        routeOrder.forEach((appointmentId, idx) => {
          appointmentPositions.set(appointmentId, { position: idx + 1, routeId: route.id });
        });
      });

      // HB- und NA-Termine (Hausbesuch und Neuaufnahme) anzeigen – nur wenn sie in der route_order stehen
      const appointmentsForDay = appointments.filter(
        (a) => a.weekday === selectedWeekday && (a.visit_type === 'HB' || a.visit_type === 'NA')
      );

      for (const appointment of appointmentsForDay) {
        const patient = patients.find((p) => p.id === appointment.patient_id);
        if (!patient) continue;

        const posInfo = appointment.id ? appointmentPositions.get(appointment.id) : undefined;
        const routeId = posInfo?.routeId;

        if (routeId) {
          const route = visibleRoutes.find((r) => r.id === routeId);
          if (route) {
            const baseMarker = createPatientMarkerData(
              patient,
              appointment,
              posInfo?.position,
              routeId,
              route
            );
            if (baseMarker) {
              newMarkers.push({ ...baseMarker, isInactive: false });
            }
          }
        }
      }
    }

    return newMarkers;
  }, [
    isLoaded,
    employees,
    patients,
    appointments,
    visibleRoutes,
    selectedWeekday,
    selectedUserId,
    selectedEmployeeIds,
    selectedAreas,
    isAreaTourDay,
    mainRoute,
  ]);

  // Route-Polylines für alle sichtbaren Routen
  const routePaths = useMemo(() => {
    return visibleRoutes.map((route) => {
      const employee = employees.find((e) => e.id === route.employee_id);
      const isOwn = mainRoute != null && route.id === mainRoute.id;
      const isAdditionalArea =
        isAreaTourDay && Boolean(route.area) && selectedAreas.includes(String(route.area));
      const color = isOwn
        ? '#2196F3'
        : isAdditionalArea
          ? getTourAreaColor(String(route.area))
          : employee?.id
            ? getColorForAdditionalTour(employee.id)
            : '#9E9E9E';

      return {
        employeeId: route.employee_id ?? null,
        routeId: route.id,
        routeOrder: isOwn ? getOwnRouteOrder(route) : parseRouteOrder(route.route_order),
        color,
        polyline: isOwn ? getOwnRoutePolyline(route) : route.polyline,
        totalDistance: isOwn ? getOwnRouteDistance(route) : route.total_distance || 0,
        totalDuration: isOwn ? getOwnRouteDuration(route) : route.total_duration || 0,
        employeeName: employee
          ? `${employee.first_name} ${employee.last_name}`
          : route.area
            ? `AW ${route.area}`
            : 'Unknown Employee',
      };
    });
  }, [visibleRoutes, employees, selectedUserId, isAreaTourDay, selectedAreas, mainRoute]);

  useEffect(() => {
    if (map && employees.length > 0 && patients.length > 0 && appointments.length > 0) {
      if (visibleRoutes.length > 0) {
        const bounds = calculateRouteBounds(visibleRoutes, employees, patients, appointments);
        if (bounds) {
          map.fitBounds(bounds, {
            top: 50,
            right: 50,
            bottom: 50,
            left: 50,
          });
        }
      }
    }
  }, [map, visibleRoutes, employees, patients, appointments]);

  // Fehler- und Ladezustände
  const isLoading =
    employeesLoading || patientsLoading || appointmentsLoading || routesLoading || !isLoaded;
  const error =
    mapError ||
    (patientsError instanceof Error ? patientsError.message : null) ||
    (appointmentsError instanceof Error ? appointmentsError.message : null) ||
    (routesError instanceof Error ? routesError.message : null);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Fehler beim Laden der Daten: {error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={defaultZoom}
        onLoad={setMap}
        onUnmount={() => setMap(null)}
        onClick={onMapClick}
        options={mapOptions}
      >
        <RoutePolylines routes={routePaths} map={map} />
        <MapMarkers
          markers={markers}
          patients={patients}
          employees={employees}
          appointments={appointments}
          routes={visibleRoutes}
        />
      </GoogleMap>
    </Box>
  );
};
