import { useEffect, useState } from 'react';

/** Mount sheet after open — avoids StrictMode + react-modal-sheet stale motion state. */
export function useDeferredSheetMount(isOpen: boolean) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShouldRender(false);
      return;
    }

    const frame = requestAnimationFrame(() => setShouldRender(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  return shouldRender;
}
