import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Typ für gültige Wochentage
export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

const WEEKDAYS: Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export function getCurrentBusinessWeekday(): Weekday {
  const currentDay = WEEKDAYS[new Date().getDay()];
  const isBusinessDay =
    currentDay === 'monday' ||
    currentDay === 'tuesday' ||
    currentDay === 'wednesday' ||
    currentDay === 'thursday' ||
    currentDay === 'friday';
  return isBusinessDay && currentDay ? currentDay : 'monday';
}

export function getCurrentAreaWeekday(): Weekday {
  const currentDay = WEEKDAYS[new Date().getDay()];
  const isAreaDay = currentDay === 'saturday' || currentDay === 'sunday';
  return isAreaDay && currentDay ? currentDay : 'saturday';
}

interface WeekdayState {
  // State
  selectedWeekday: Weekday;

  // Actions
  setSelectedWeekday: (day: Weekday) => void;
  resetToCurrentDay: () => void;
  resetToCurrentAreaDay: () => void;
}

export const useWeekdayStore = create<WeekdayState>()(
  persist(
    (set) => ({
      // State
      selectedWeekday: 'monday', // Default-Wert

      // Actions
      setSelectedWeekday: (day) => set({ selectedWeekday: day }),
      resetToCurrentDay: () => {
        set({ selectedWeekday: getCurrentBusinessWeekday() });
      },
      resetToCurrentAreaDay: () => {
        set({ selectedWeekday: getCurrentAreaWeekday() });
      },
    }),
    {
      name: 'pwa-weekday-storage',
      // Nur für die laufende Session – bei kaltem App-Start ist der Speicher leer
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
