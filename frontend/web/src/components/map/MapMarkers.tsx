import React, { useMemo, useState } from 'react';
import { AdvancedMapMarker, CircleStopMarker, CustomPlaceMarker } from '@palliroute/ui';
import {
  getMarkerFillColor,
  getMarkerLabelText,
  groupMarkersByLatLng,
  offsetOverlappingLatLng,
} from '@palliroute/shared';
import { useRouteHoverStore } from '@palliroute/stores';
import { MarkerData } from '../../types/mapTypes';
import { MarkerInfoWindow } from './MarkerInfoWindow';
import { Appointment, Employee, Patient, Route } from '../../types/models';
import { useRouteVisibility } from '../../stores/useRouteVisibilityStore';

interface MapMarkersProps {
  markers: MarkerData[];
  patients: Patient[];
  employees: Employee[];
  appointments: Appointment[];
  userArea?: string;
  routes: Route[];
}

export const MapMarkers: React.FC<MapMarkersProps> = ({
  markers,
  patients,
  employees,
  appointments,
  userArea,
  routes,
}) => {
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const hiddenMarkers = useRouteVisibility((state) => state.hiddenMarkers);
  const hoveredRouteId = useRouteHoverStore((state) => state.hoveredRouteId);
  const hoverRoute = useRouteHoverStore((state) => state.hoverRoute);
  const unhoverRoute = useRouteHoverStore((state) => state.unhoverRoute);

  const markerGroups = useMemo(() => groupMarkersByLatLng(markers), [markers]);

  return (
    <>
      {markerGroups.map((group, groupIdx) =>
        group.map((marker, idx) => {
          if (marker.routeId && hiddenMarkers.has(marker.routeId)) {
            return null;
          }
          const origLat = marker.position.lat();
          const origLng = marker.position.lng();
          const { lat, lng } = offsetOverlappingLatLng(origLat, origLng, idx, group.length);
          const displayPosition = new google.maps.LatLng(lat, lng);
          let opacity = 1;
          const color = getMarkerFillColor({
            type: marker.type,
            employeeType: marker.employeeType,
            visitType: marker.visitType,
            area: marker.area,
          });
          const label = marker.isInactive
            ? undefined
            : getMarkerLabelText(marker.routePosition, marker.visitType, marker.label);
          if (marker.isInactive) {
            opacity = 0.6;
          } else if (
            marker.type === 'employee' &&
            userArea &&
            userArea !== 'Nord- und Südkreis' &&
            marker.employeeType &&
            employees.find((e) => e.id === marker.employeeId)?.area !== userArea
          ) {
            opacity = 0.6;
          }

          const isEmphasized =
            hoveredRouteId != null && marker.routeId != null && marker.routeId === hoveredRouteId;
          const isDimmed =
            hoveredRouteId != null && (marker.routeId == null || marker.routeId !== hoveredRouteId);

          let zIndex = 10;
          if (marker.type === 'custom') zIndex = 1000;
          else if (isEmphasized) zIndex = 500;
          else if (isDimmed) zIndex = 1;

          return (
            <AdvancedMapMarker
              key={`marker-${groupIdx}-${idx}`}
              position={displayPosition}
              title={marker.title}
              zIndex={zIndex}
              onClick={() => setSelectedMarker({ ...marker, displayPosition })}
              onMouseOver={() => {
                if (marker.routeId != null) hoverRoute(marker.routeId);
              }}
              onMouseOut={unhoverRoute}
            >
              {marker.type === 'custom' ? (
                <CustomPlaceMarker opacity={opacity} dimmed={isDimmed} />
              ) : (
                <CircleStopMarker
                  color={color}
                  label={label}
                  opacity={opacity}
                  dimmed={isDimmed}
                  emphasized={isEmphasized}
                />
              )}
            </AdvancedMapMarker>
          );
        })
      )}
      {selectedMarker && (
        <MarkerInfoWindow
          markerList={[selectedMarker]}
          position={selectedMarker.displayPosition || selectedMarker.position}
          onClose={() => setSelectedMarker(null)}
          patients={patients}
          employees={employees}
          appointments={appointments}
          userArea={userArea}
          routes={routes}
        />
      )}
    </>
  );
};
