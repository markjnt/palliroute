import { useEffect, useRef } from 'react';
import type { RoutePathData } from '@palliroute/models/map';
import { ROUTE_POLYLINE } from '@palliroute/shared';
import { useRouteHoverStore } from '@palliroute/stores';

interface RoutePolylinesProps {
  routes: RoutePathData[];
  map: google.maps.Map | null;
  hiddenRouteIds?: Set<number>;
  /** Route highlight on hover. Web only — keep off in the PWA. */
  enableHover?: boolean;
}

/**
 * Renders route polylines and optionally highlights the hovered route.
 */
export function RoutePolylines({
  routes,
  map,
  hiddenRouteIds,
  enableHover = false,
}: RoutePolylinesProps) {
  const polylineRefs = useRef<{ [id: number]: google.maps.Polyline }>({});
  const hitRefs = useRef<{ [id: number]: google.maps.Polyline }>({});
  const previousDataRef = useRef<{ [id: number]: string }>({});
  const listenersRef = useRef<{ [id: number]: google.maps.MapsEventListener[] }>({});

  const hoveredRouteId = useRouteHoverStore((state) =>
    enableHover ? state.hoveredRouteId : null
  );
  const hoverRoute = useRouteHoverStore((state) => state.hoverRoute);
  const unhoverRoute = useRouteHoverStore((state) => state.unhoverRoute);

  useEffect(() => {
    if (!map || !window.google || !window.google.maps.geometry) return;

    const clearHit = (routeId: number) => {
      listenersRef.current[routeId]?.forEach((listener) => listener.remove());
      delete listenersRef.current[routeId];
      if (hitRefs.current[routeId]) {
        hitRefs.current[routeId].setMap(null);
        delete hitRefs.current[routeId];
      }
    };

    const attachHover = (routeId: number, hit: google.maps.Polyline) => {
      listenersRef.current[routeId]?.forEach((listener) => listener.remove());
      listenersRef.current[routeId] = [
        hit.addListener('mouseover', () => hoverRoute(routeId)),
        hit.addListener('mouseout', () => unhoverRoute()),
      ];
    };

    for (const { routeId, polyline, color } of routes) {
      const isEmpty = polyline == null || polyline === '';
      const oldEncoded = previousDataRef.current[routeId] || '';
      const isHovered = enableHover && hoveredRouteId === routeId;
      const isDimmed = enableHover && hoveredRouteId != null && hoveredRouteId !== routeId;

      if (isEmpty) {
        if (polylineRefs.current[routeId]) {
          polylineRefs.current[routeId].setMap(null);
          delete polylineRefs.current[routeId];
        }
        clearHit(routeId);
        previousDataRef.current[routeId] = '';
        continue;
      }

      if (!polylineRefs.current[routeId]) {
        const decoded = window.google.maps.geometry.encoding.decodePath(polyline);
        polylineRefs.current[routeId] = new window.google.maps.Polyline({
          path: decoded,
          map,
          strokeColor: color,
          strokeOpacity: 1.0,
          strokeWeight: ROUTE_POLYLINE.weight,
          zIndex: 3,
          clickable: false,
        });
        previousDataRef.current[routeId] = polyline;
      } else if (polyline !== oldEncoded) {
        const newPath = window.google.maps.geometry.encoding.decodePath(polyline);
        polylineRefs.current[routeId].setPath(newPath);
        hitRefs.current[routeId]?.setPath(newPath);
        previousDataRef.current[routeId] = polyline;
      }

      if (enableHover) {
        if (!hitRefs.current[routeId]) {
          hitRefs.current[routeId] = new window.google.maps.Polyline({
            path: polylineRefs.current[routeId].getPath(),
            map,
            strokeColor: color,
            strokeOpacity: 0.01,
            strokeWeight: ROUTE_POLYLINE.hitWeight,
            zIndex: 4,
            clickable: true,
          });
        }
        attachHover(routeId, hitRefs.current[routeId]);
      } else {
        clearHit(routeId);
      }

      const shouldBeVisible = !hiddenRouteIds?.has(routeId);
      polylineRefs.current[routeId].setMap(shouldBeVisible ? map : null);
      if (enableHover) {
        hitRefs.current[routeId]?.setMap(shouldBeVisible ? map : null);
      }

      if (shouldBeVisible) {
        polylineRefs.current[routeId].setOptions({
          strokeColor: color,
          strokeOpacity: isDimmed ? ROUTE_POLYLINE.dimmedOpacity : 1,
          strokeWeight: isHovered ? ROUTE_POLYLINE.hoverWeight : ROUTE_POLYLINE.weight,
          zIndex: isHovered ? 20 : 3,
        });
      }
    }

    Object.keys(polylineRefs.current).forEach((idStr) => {
      const id = Number(idStr);
      if (!routes.some((r) => r.routeId === id && r.polyline)) {
        polylineRefs.current[id].setMap(null);
        delete polylineRefs.current[id];
        clearHit(id);
        delete previousDataRef.current[id];
      }
    });
  }, [routes, map, hiddenRouteIds, hoveredRouteId, hoverRoute, unhoverRoute, enableHover]);

  useEffect(() => {
    return () => {
      Object.values(listenersRef.current).forEach((group) =>
        group.forEach((listener) => listener.remove())
      );
      Object.values(polylineRefs.current).forEach((line) => line.setMap(null));
      Object.values(hitRefs.current).forEach((line) => line.setMap(null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup must use latest polyline instances
  }, []);

  return null;
}
