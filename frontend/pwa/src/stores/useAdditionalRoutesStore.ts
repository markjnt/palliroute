import { create } from 'zustand';

interface AdditionalRoutesStore {
  selectedEmployeeIds: (number | string)[];
  selectedAreas: string[];
  addEmployee: (employeeId: number | string) => void;
  toggleEmployee: (employeeId: number | string) => void;
  toggleArea: (area: string) => void;
  selectAll: (employeeIds: (number | string)[]) => void;
  deselectAll: () => void;
  clearAll: () => void;
  resetForNewUser: () => void;
}

const emptySelection = {
  selectedEmployeeIds: [] as (number | string)[],
  selectedAreas: [] as string[],
};

export const useAdditionalRoutesStore = create<AdditionalRoutesStore>((set) => ({
  selectedEmployeeIds: [],
  selectedAreas: [],

  addEmployee: (employeeId) => {
    set((state) => {
      const numericId = Number(employeeId);
      if (!numericId || Number.isNaN(numericId)) return state;
      if (state.selectedEmployeeIds.some((id) => Number(id) === numericId)) return state;
      return { selectedEmployeeIds: [...state.selectedEmployeeIds, numericId] };
    });
  },

  toggleEmployee: (employeeId: number | string) => {
    set((state) => {
      const numericId = Number(employeeId);
      const isSelected = state.selectedEmployeeIds.some((id) => Number(id) === numericId);
      if (isSelected) {
        return {
          selectedEmployeeIds: state.selectedEmployeeIds.filter((id) => Number(id) !== numericId),
        };
      } else {
        return {
          selectedEmployeeIds: [...state.selectedEmployeeIds, numericId],
        };
      }
    });
  },

  toggleArea: (area: string) => {
    set((state) => {
      if (state.selectedAreas.includes(area)) {
        return { selectedAreas: state.selectedAreas.filter((item) => item !== area) };
      }
      return { selectedAreas: [...state.selectedAreas, area] };
    });
  },

  selectAll: (employeeIds: (number | string)[]) => {
    set({ selectedEmployeeIds: [...employeeIds] });
  },

  deselectAll: () => {
    set(emptySelection);
  },

  clearAll: () => {
    set(emptySelection);
  },

  resetForNewUser: () => {
    set(emptySelection);
  },
}));
