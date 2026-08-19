import React, { useMemo, useState } from 'react';
import { AdvancedMapMarker, CircleStopMarker } from '@palliroute/ui';
import {
  getColorForAdditionalTour,
  getMarkerFillColor,
  getMarkerLabelText,
  getTourAreaColor,
  groupMarkersByLatLng,
  offsetOverlappingLatLng,
} from '@palliroute/shared';
import { MarkerData } from '../../types/mapTypes';
import { Appointment, Employee, Patient, Route } from '../../types/models';
import { StopPopup } from './StopPopup';
import { useAdditionalRoutesStore } from '../../stores/useAdditionalRoutesStore';
import { useUserStore } from '../../stores/useUserStore';

interface MapMarkersProps {
  markers: MarkerData[];
  patients: Patient[];
  employees: Employee[];
  appointments: Appointment[];
  routes: Route[];
}

export const MapMarkers: React.FC<MapMarkersProps> = ({
  markers,
  patients,
  employees,
  appointments,
  routes,
}) => {
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const { selectedEmployeeIds, selectedAreas } = useAdditionalRoutesStore();
  const { selectedUserId } = useUserStore();

  const markerGroups = useMemo(() => groupMarkersByLatLng(markers), [markers]);

  const selectedPatient = useMemo(() => {
    if (!selectedMarker || selectedMarker.type !== 'patient' || !selectedMarker.patientId) {
      return undefined;
    }
    return patients.find((p) => p.id === selectedMarker.patientId);
  }, [selectedMarker, patients]);

  const selectedAppointment = useMemo(() => {
    if (!selectedMarker || selectedMarker.type !== 'patient' || !selectedMarker.appointmentId) {
      return undefined;
    }
    return appointments.find((a) => a.id === selectedMarker.appointmentId);
  }, [selectedMarker, appointments]);

  const isAdditionalEmployee = (employeeId: number | string | null | undefined) => {
    if (employeeId == null) return false;
    const numericId = Number(employeeId);
    return selectedEmployeeIds.some((id) => Number(id) === numericId);
  };

  const isAdditionalArea = (area: string | null | undefined) => {
    if (!area) return false;
    return selectedAreas.includes(area);
  };

  const isAdditionalRouteMarker = (marker: MarkerData): boolean => {
    if (marker.type === 'tour_area') {
      return isAdditionalArea(marker.area);
    }
    if (!marker.routeId) return false;
    const route = routes.find((r) => r.id === marker.routeId);
    if (!route) return false;
    if (Number(route.employee_id) === Number(selectedUserId)) return false;

    return isAdditionalEmployee(route.employee_id) || isAdditionalArea(String(route.area));
  };

  const getMarkerRouteColor = (marker: MarkerData): string | null => {
    if (marker.type === 'tour_area') {
      return getTourAreaColor(marker.area);
    }

    if (!marker.routeId) return null;
    const route = routes.find((r) => r.id === marker.routeId);
    if (!route) return null;

    if (Number(route.employee_id) === Number(selectedUserId)) {
      return '#2196F3';
    }

    if (isAdditionalArea(String(route.area))) {
      return getTourAreaColor(String(route.area));
    }

    if (isAdditionalEmployee(route.employee_id)) {
      return getColorForAdditionalTour(route.employee_id ?? undefined);
    }

    return null;
  };

  const handleMarkerClick = (marker: MarkerData, displayPosition: google.maps.LatLng) => {
    setSelectedMarker({ ...marker, displayPosition });
  };

  return (
    <>
      {markerGroups.map((group, groupIdx) =>
        group.map((marker, idx) => {
          const origLat = marker.position.lat();
          const origLng = marker.position.lng();
          const { lat, lng } = offsetOverlappingLatLng(origLat, origLng, idx, group.length);
          const displayPosition = new google.maps.LatLng(lat, lng);

          const isAdditionalRoute = isAdditionalRouteMarker(marker);
          const routeColor = getMarkerRouteColor(marker);

          let opacity = 1;

          const color = getMarkerFillColor({
            type: marker.type,
            employeeType: marker.employeeType,
            visitType: marker.visitType,
            area: marker.area,
            isInactive: marker.isInactive || false,
            routeColor: isAdditionalRoute ? routeColor : null,
          });

          const label = marker.isInactive
            ? undefined
            : getMarkerLabelText(marker.routePosition, marker.visitType, marker.label);

          if (marker.isInactive) {
            opacity = 0.6;
          }

          const markerKey = `marker-${groupIdx}-${idx}-${marker.appointmentId || marker.employeeId || 'none'}`;

          return (
            <AdvancedMapMarker
              key={markerKey}
              position={displayPosition}
              title={marker.title}
              onClick={() => handleMarkerClick(marker, displayPosition)}
            >
              <CircleStopMarker color={color} label={label} opacity={opacity} />
            </AdvancedMapMarker>
          );
        })
      )}

      {selectedMarker && selectedMarker.type === 'patient' && selectedMarker.displayPosition && (
        <StopPopup
          marker={selectedMarker}
          patient={selectedPatient}
          appointment={selectedAppointment}
          onClose={() => setSelectedMarker(null)}
          isAdditionalRoute={isAdditionalRouteMarker(selectedMarker)}
          employee={(() => {
            if (!selectedMarker.routeId) return undefined;
            const route = routes.find((r) => r.id === selectedMarker.routeId);
            if (!route) return undefined;
            return employees.find((e) => e.id === route.employee_id);
          })()}
        />
      )}
    </>
  );
};
