import { create } from "zustand";
import { getCurrentCalendarWeek as getIsoCalendarWeek } from "@palliroute/shared";

interface CalendarWeekStore {
  selectedCalendarWeek: number | null;
  availableCalendarWeeks: number[];
  setSelectedCalendarWeek: (week: number) => void;
  setAvailableCalendarWeeks: (weeks: number[]) => void;
  getCurrentCalendarWeek: () => number;
  clearSelection: () => void;
}

export const useCalendarWeekStore = create<CalendarWeekStore>()((set, get) => ({
  selectedCalendarWeek: null,
  availableCalendarWeeks: [],

  setSelectedCalendarWeek: (week: number) => {
    const currentState = get();
    // Nur setzen, wenn die Woche in den verfügbaren Wochen enthalten ist
    if (currentState.availableCalendarWeeks.includes(week)) {
      set({ selectedCalendarWeek: week });
    } else {
      console.warn(
        `Calendar week ${week} is not available. Available weeks: ${currentState.availableCalendarWeeks.join(", ")}`,
      );
    }
  },

  setAvailableCalendarWeeks: (weeks: number[]) => {
    set({ availableCalendarWeeks: weeks });

    const currentState = get();

    // Prüfen, ob die aktuell ausgewählte Woche noch verfügbar ist
    if (
      currentState.selectedCalendarWeek !== null &&
      !weeks.includes(currentState.selectedCalendarWeek)
    ) {
      // Aktuell ausgewählte Woche ist nicht mehr verfügbar, wähle eine neue aus
      const currentWeek = currentState.getCurrentCalendarWeek();
      const weekToSelect = weeks.includes(currentWeek) ? currentWeek : weeks[0];
      set({ selectedCalendarWeek: weekToSelect });
      console.warn(
        `Selected calendar week ${currentState.selectedCalendarWeek} is no longer available. Switched to week ${weekToSelect}`,
      );
    } else if (currentState.selectedCalendarWeek === null && weeks.length > 0) {
      // Wenn noch keine Woche ausgewählt ist, wähle die aktuelle Woche aus
      const currentWeek = currentState.getCurrentCalendarWeek();
      const weekToSelect = weeks.includes(currentWeek) ? currentWeek : weeks[0];
      set({ selectedCalendarWeek: weekToSelect });
    }
  },

  getCurrentCalendarWeek: () => getIsoCalendarWeek(),

  clearSelection: () => {
    set({
      selectedCalendarWeek: null,
      availableCalendarWeeks: [],
    });
  },
}));
