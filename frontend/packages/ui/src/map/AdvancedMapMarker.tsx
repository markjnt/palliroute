import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useGoogleMap } from '@react-google-maps/api';

export interface AdvancedMapMarkerProps {
  position: google.maps.LatLng | google.maps.LatLngLiteral;
  title?: string;
  zIndex?: number;
  onClick?: () => void;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
  children: ReactNode;
}

/**
 * Current Google Maps marker (`AdvancedMarkerElement`). The legacy
 * `google.maps.Marker` used by `@react-google-maps/api`'s `<Marker>` is deprecated.
 */
export function AdvancedMapMarker({
  position,
  title,
  zIndex,
  onClick,
  onMouseOver,
  onMouseOut,
  children,
}: AdvancedMapMarkerProps) {
  const map = useGoogleMap();
  const [container] = useState(() => {
    const el = document.createElement('div');
    el.style.cursor = 'pointer';
    return el;
  });
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const onClickRef = useRef(onClick);
  const onMouseOverRef = useRef(onMouseOver);
  const onMouseOutRef = useRef(onMouseOut);
  onClickRef.current = onClick;
  onMouseOverRef.current = onMouseOver;
  onMouseOutRef.current = onMouseOut;

  useEffect(() => {
    if (!map || !google.maps.marker?.AdvancedMarkerElement) return undefined;

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position,
      title,
      content: container,
      zIndex,
      gmpClickable: true,
    });
    markerRef.current = marker;

    const handleClick = (event: Event) => {
      event.stopPropagation();
      const mapsEvent = event as Event & { stop?: () => void };
      mapsEvent.stop?.();
      onClickRef.current?.();
    };
    const handleOver = () => onMouseOverRef.current?.();
    const handleOut = () => onMouseOutRef.current?.();

    marker.addEventListener('gmp-click', handleClick);
    container.addEventListener('mouseenter', handleOver);
    container.addEventListener('mouseleave', handleOut);

    return () => {
      marker.removeEventListener('gmp-click', handleClick);
      container.removeEventListener('mouseenter', handleOver);
      container.removeEventListener('mouseleave', handleOut);
      marker.map = null;
      markerRef.current = null;
    };
    // Recreate only when the map instance changes; position/title/zIndex update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, container]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.position = position;
    marker.title = title ?? '';
    marker.zIndex = zIndex;
  }, [position, title, zIndex]);

  return createPortal(children, container);
}

export interface CircleStopMarkerProps {
  color: string;
  label?: string;
  opacity?: number;
  dimmed?: boolean;
  emphasized?: boolean;
}

export function CircleStopMarker({
  color,
  label,
  opacity = 1,
  dimmed = false,
  emphasized = false,
}: CircleStopMarkerProps) {
  return (
    <div
      style={{
        boxSizing: 'border-box',
        width: 22,
        height: 22,
        borderRadius: '50%',
        backgroundColor: color,
        border: '2px solid #ffffff',
        boxShadow: emphasized ? '0 1px 4px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontWeight: 700,
        fontSize: label && label.length > 2 ? 8 : 10,
        lineHeight: 1,
        opacity: dimmed ? Math.min(opacity, 0.28) : opacity,
        transform: emphasized ? 'scale(1.12)' : 'scale(1)',
        transition: 'opacity 120ms ease, transform 120ms ease',
      }}
    >
      {label}
    </div>
  );
}

export function CustomPlaceMarker({
  opacity = 1,
  dimmed = false,
}: {
  opacity?: number;
  dimmed?: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="35"
      height="35"
      viewBox="0 0 56 56"
      style={{
        display: 'block',
        opacity: dimmed ? Math.min(opacity, 0.28) : opacity,
        filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.35))',
        transition: 'opacity 120ms ease',
      }}
    >
      <circle cx="28" cy="28" r="26" fill="#ff5722" stroke="#fff" strokeWidth="3" />
      <path
        fill="#fff"
        d="M28 14c-6.07 0-11 4.93-11 11 0 8.25 11 18 11 18s11-9.75 11-18c0-6.07-4.93-11-11-11zm0 15c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
      />
    </svg>
  );
}
