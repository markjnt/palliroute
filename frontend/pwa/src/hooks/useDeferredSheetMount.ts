import { useCallback, useEffect, useRef, useState } from "react";

const CLOSE_FALLBACK_MS = 350;

/** Mount sheet after open; unmount after close animation completes. */
export function useDeferredSheetMount(isOpen: boolean) {
  const [shouldRender, setShouldRender] = useState(false);
  const isOpenRef = useRef(isOpen);
  const didMountOnceRef = useRef(false);
  isOpenRef.current = isOpen;

  useEffect(() => {
    if (isOpen) {
      // First mount: defer one frame (StrictMode + react-modal-sheet).
      // Re-opens: mount immediately so a missed onCloseEnd can't block the next open.
      if (didMountOnceRef.current) {
        setShouldRender(true);
        return;
      }

      const frame = requestAnimationFrame(() => {
        setShouldRender(true);
        didMountOnceRef.current = true;
      });
      return () => cancelAnimationFrame(frame);
    }

    // Fallback unmount if onCloseEnd never fires (common in dev / StrictMode).
    const timeout = window.setTimeout(() => {
      if (!isOpenRef.current) {
        setShouldRender(false);
      }
    }, CLOSE_FALLBACK_MS);

    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  const onCloseEnd = useCallback(() => {
    if (!isOpenRef.current) {
      setShouldRender(false);
    }
  }, []);

  return { shouldRender, onCloseEnd };
}
