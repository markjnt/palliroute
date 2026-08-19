import { useEffect, useRef } from 'react';
import { useGoogleMap } from '@react-google-maps/api';

/** Closes an InfoWindow when the map (not a marker / the window) is clicked or tapped. */
export function useCloseOnMapClick(onClose: () => void, enabled = true) {
  const map = useGoogleMap();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!map || !enabled) return undefined;
    const listener = map.addListener('click', () => {
      onCloseRef.current();
    });
    return () => {
      listener.remove();
    };
  }, [map, enabled]);
}
