import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, Button, Chip, CircularProgress, Typography } from '@mui/material';
import { WarningAmber as WarningAmberIcon } from '@mui/icons-material';
import { Sheet } from 'react-modal-sheet';
import { GoogleMap } from '@react-google-maps/api';
import { RoutePolylines } from '@palliroute/ui';
import { getOwnRouteOrder, getTourAreaColor } from '@palliroute/shared';
import { useDeferredSheetMount } from '../../hooks/useDeferredSheetMount';
import { useUserStore } from '../../stores/useUserStore';
import { MapMarkers } from '../map/MapMarkers';
import {
  calculateRouteBounds,
  createEmployeeMarkerData,
  createPatientMarkerData,
  defaultCenter,
  defaultZoom,
  mapOptions,
} from '../../utils/mapUtils';
import type { Appointment, Employee, Patient, Route, Weekday } from '../../types/models';
import type { MarkerData } from '../../types/mapTypes';

interface AwTourPreviewSheetProps {
  open: boolean;
  onClose: () => void;
  weekdayLabel: string;
  weekday: Weekday;
  area: string;
  route?: Route;
  appointments: Appointment[];
  patients: Patient[];
  employees: Employee[];
  onAssign: () => void;
}

function isGoogleMapsReady(): boolean {
  return typeof google !== 'undefined' && Boolean(google.maps);
}

export const AwTourPreviewSheet: React.FC<AwTourPreviewSheetProps> = ({
  open,
  onClose,
  weekdayLabel,
  weekday: _weekday,
  area,
  route,
  appointments,
  patients,
  employees,
  onAssign,
}) => {
  const { shouldRender, onCloseEnd } = useDeferredSheetMount(open);
  const { selectedUserId } = useUserStore();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(isGoogleMapsReady);
  const [previewPolyline, setPreviewPolyline] = useState('');
  const [previewStopOrder, setPreviewStopOrder] = useState<number[]>([]);
  const [polylineLoading, setPolylineLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isGoogleMapsReady()) {
      setIsLoaded(true);
      return;
    }
    const interval = window.setInterval(() => {
      if (isGoogleMapsReady()) {
        setIsLoaded(true);
        window.clearInterval(interval);
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [open]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedUserId),
    [employees, selectedUserId]
  );

  const assignedEmployee = useMemo(
    () =>
      route?.employee_id
        ? employees.find((employee) => employee.id === route.employee_id)
        : undefined,
    [employees, route?.employee_id]
  );

  const areaColor = getTourAreaColor(area);

  const visibleRoutes = useMemo(() => (route ? [route] : []), [route]);

  const markers = useMemo(() => {
    if (!isLoaded || !route) return [];
    const next: MarkerData[] = [];

    if (selectedEmployee) {
      const startMarker = createEmployeeMarkerData(selectedEmployee, route.id);
      if (startMarker) next.push(startMarker);
    }

    const stopOrder = previewStopOrder.length > 0 ? previewStopOrder : getOwnRouteOrder(route);
    stopOrder.forEach((appointmentId, index) => {
      const appointment = appointments.find((item) => item.id === appointmentId);
      if (!appointment) return;
      const patient = patients.find((item) => item.id === appointment.patient_id);
      if (!patient) return;
      const marker = createPatientMarkerData(patient, appointment, index + 1, route.id, route);
      if (marker) next.push(marker);
    });
    return next;
  }, [isLoaded, route, appointments, patients, selectedEmployee, previewStopOrder]);

  useEffect(() => {
    if (
      !open ||
      !isLoaded ||
      !route ||
      selectedEmployee?.latitude == null ||
      selectedEmployee?.longitude == null
    ) {
      setPreviewPolyline('');
      setPreviewStopOrder([]);
      setPolylineLoading(false);
      return;
    }

    const orderedAppointmentIds: number[] = [];
    const waypoints: google.maps.DirectionsWaypoint[] = [];
    for (const appointmentId of getOwnRouteOrder(route)) {
      const appointment = appointments.find((item) => item.id === appointmentId);
      if (!appointment) continue;
      const patient = patients.find((item) => item.id === appointment.patient_id);
      if (patient?.latitude == null || patient?.longitude == null) continue;
      orderedAppointmentIds.push(appointmentId);
      waypoints.push({
        location: { lat: patient.latitude, lng: patient.longitude },
        stopover: true,
      });
    }

    if (waypoints.length === 0) {
      setPreviewPolyline('');
      setPreviewStopOrder([]);
      setPolylineLoading(false);
      return;
    }

    let cancelled = false;
    setPolylineLoading(true);
    setPreviewPolyline('');
    setPreviewStopOrder([]);

    const origin = {
      lat: selectedEmployee.latitude,
      lng: selectedEmployee.longitude,
    };
    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin,
        destination: origin,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true,
      },
      (result, status) => {
        if (cancelled) return;
        setPolylineLoading(false);
        const overviewPath = result?.routes[0]?.overview_path;
        if (status === google.maps.DirectionsStatus.OK && overviewPath?.length) {
          const waypointOrder = result?.routes[0]?.waypoint_order ?? [];
          const optimizedOrder =
            waypointOrder.length === orderedAppointmentIds.length
              ? waypointOrder.map((index) => orderedAppointmentIds[index])
              : orderedAppointmentIds;
          setPreviewStopOrder(optimizedOrder);
          setPreviewPolyline(google.maps.geometry.encoding.encodePath(overviewPath));
          return;
        }
        console.warn('AW preview directions failed:', status);
        setPreviewPolyline('');
        setPreviewStopOrder([]);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [open, isLoaded, route, selectedEmployee, appointments, patients]);

  const routePaths = useMemo(() => {
    if (!route || !previewPolyline) return [];
    return [
      {
        employeeId: selectedUserId ?? null,
        routeId: route.id,
        routeOrder: previewStopOrder.length > 0 ? previewStopOrder : getOwnRouteOrder(route),
        color: '#2196F3',
        polyline: previewPolyline,
        totalDistance: 0,
        totalDuration: 0,
        employeeName: `AW ${area}`,
      },
    ];
  }, [route, previewPolyline, previewStopOrder, selectedUserId, area]);

  useEffect(() => {
    if (!map || !isLoaded || !route) return;
    const bounds =
      calculateRouteBounds([route], employees, patients, appointments) ??
      new google.maps.LatLngBounds();
    if (selectedEmployee?.latitude != null && selectedEmployee?.longitude != null) {
      bounds.extend(new google.maps.LatLng(selectedEmployee.latitude, selectedEmployee.longitude));
    }
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        top: 56,
        right: 40,
        bottom: 24,
        left: 40,
      });
    }
  }, [map, isLoaded, route, employees, patients, appointments, selectedEmployee]);

  if (!shouldRender) return null;

  return createPortal(
    <Sheet
      isOpen={open}
      onClose={onClose}
      onCloseEnd={onCloseEnd}
      initialSnap={0}
      snapPoints={[0.92, 0]}
      style={{ zIndex: 13000 }}
    >
      <Sheet.Container>
        <Sheet.Header>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '8px 0',
              cursor: 'grab',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '4px',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
              }}
            />
          </div>
          <Box sx={{ px: 3, pb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: '#1d1d1f', lineHeight: 1.25 }}
                >
                  AW-Tour: {weekdayLabel}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 0.75,
                    mt: 0.75,
                  }}
                >
                  <Chip
                    size="small"
                    label={area}
                    sx={{
                      height: 22,
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      bgcolor: areaColor,
                      color: 'white',
                      '& .MuiChip-label': { px: 0.9 },
                    }}
                  />
                  {assignedEmployee ? (
                    <Chip
                      size="small"
                      icon={<WarningAmberIcon />}
                      label={`${assignedEmployee.first_name} ${assignedEmployee.last_name}`}
                      sx={{
                        height: 22,
                        maxWidth: '100%',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        bgcolor: 'rgba(255, 193, 7, 0.18)',
                        color: '#f57f17',
                        border: '1px solid rgba(255, 193, 7, 0.55)',
                        '& .MuiChip-icon': {
                          color: '#f9a825',
                          fontSize: '0.95rem',
                          ml: '4px',
                        },
                        '& .MuiChip-label': {
                          px: 0.75,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        },
                      }}
                    />
                  ) : (
                    <Chip
                      size="small"
                      label="Nicht zugewiesen"
                      variant="outlined"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        color: 'text.secondary',
                        borderColor: 'rgba(0, 0, 0, 0.12)',
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  )}
                </Box>
              </Box>
              <Button
                variant="contained"
                onClick={onAssign}
                disabled={!route}
                sx={{
                  flexShrink: 0,
                  textTransform: 'none',
                  borderRadius: 1.5,
                  fontWeight: 600,
                  bgcolor: '#ff9800',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#f57c00', boxShadow: 'none' },
                  '&.Mui-disabled': { bgcolor: 'rgba(255, 152, 0, 0.4)', color: 'white' },
                }}
              >
                Zuweisen
              </Button>
            </Box>
          </Box>
        </Sheet.Header>

        <Sheet.Content style={{ paddingBottom: 0 }} disableDrag>
          <Box
            sx={{
              position: 'relative',
              height: '100%',
              width: '100%',
              overflow: 'hidden',
              bgcolor: '#f5f5f5',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            }}
          >
            {isLoaded ? (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bottom: -40,
                  height: 'calc(100% + 40px)',
                }}
              >
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={defaultCenter}
                  zoom={defaultZoom}
                  onLoad={setMap}
                  onUnmount={() => setMap(null)}
                  options={{
                    ...mapOptions,
                    disableDefaultUI: true,
                    zoomControl: false,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    gestureHandling: 'greedy',
                    clickableIcons: false,
                  }}
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
                {polylineLoading ? (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.92)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      zIndex: 2,
                    }}
                  >
                    <CircularProgress size={16} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#1d1d1f' }}>
                      Route wird berechnet…
                    </Typography>
                  </Box>
                ) : null}
              </Box>
            ) : (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CircularProgress size={28} />
              </Box>
            )}
          </Box>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop onTap={onClose} />
    </Sheet>,
    document.body
  );
};

export default AwTourPreviewSheet;
