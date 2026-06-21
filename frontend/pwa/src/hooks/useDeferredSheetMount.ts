import { useCallback, useEffect, useRef, useState } from 'react';

/** Mount sheet after open; unmount after close animation completes. */
export function useDeferredSheetMount(isOpen: boolean) {
  const [shouldRender, setShouldRender] = useState(false);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frame = requestAnimationFrame(() => setShouldRender(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const onCloseEnd = useCallback(() => {
    if (!isOpenRef.current) {
      setShouldRender(false);
    }
  }, []);

  return { shouldRender, onCloseEnd };
}
