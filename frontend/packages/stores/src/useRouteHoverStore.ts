import { create } from "zustand";

const UNHOVER_DELAY_MS = 80;

let unhoverTimer: ReturnType<typeof setTimeout> | null = null;

type RouteHoverState = {
  hoveredRouteId: number | null;
  hoverRoute: (id: number) => void;
  unhoverRoute: () => void;
};

export const useRouteHoverStore = create<RouteHoverState>((set) => ({
  hoveredRouteId: null,
  hoverRoute: (id) => {
    if (unhoverTimer) {
      clearTimeout(unhoverTimer);
      unhoverTimer = null;
    }
    set({ hoveredRouteId: id });
  },
  unhoverRoute: () => {
    if (unhoverTimer) {
      clearTimeout(unhoverTimer);
    }
    unhoverTimer = setTimeout(() => {
      set({ hoveredRouteId: null });
      unhoverTimer = null;
    }, UNHOVER_DELAY_MS);
  },
}));
