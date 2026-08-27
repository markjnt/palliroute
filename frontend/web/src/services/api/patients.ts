import { api } from "@palliroute/shared";
import { Patient, PatientImportResponse } from "../../types/models";

interface CalendarWeeksResponse {
  calendar_weeks: number[];
  count: number;
}

export const patientsApi = {
  // Get all patients
  async getAll(calendarWeek?: number): Promise<Patient[]> {
    try {
      const params = calendarWeek ? { calendar_week: calendarWeek } : {};
      const response = await api.get("/patients/", { params });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch patients:", error);
      throw error;
    }
  },

  // Get single patient by ID
  async getById(id: number): Promise<Patient> {
    try {
      const response = await api.get(`/patients/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch patient with ID ${id}:`, error);
      throw error;
    }
  },

  // Import patients from Excel file (async with status polling)
  async import(): Promise<PatientImportResponse> {
    try {
      const start = await api.post("/patients/import");
      if (start.status === 200) {
        return start.data;
      }
      if (start.status !== 202) {
        throw new Error(
          start.data?.error || "Import konnte nicht gestartet werden",
        );
      }

      const pollIntervalMs = 2000;
      const maxWaitMs = 15 * 60 * 1000;
      const deadline = Date.now() + maxWaitMs;

      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        const statusRes = await api.get("/patients/import/status");
        const status = statusRes.data?.status;
        if (status === "completed" && statusRes.data?.result) {
          return statusRes.data.result;
        }
        if (status === "failed") {
          throw new Error(statusRes.data?.error || "Import fehlgeschlagen");
        }
      }
      throw new Error("Import-Timeout: Der Import dauert länger als erwartet");
    } catch (error) {
      console.error("Failed to import patients from Excel:", error);
      throw error;
    }
  },

  // Get available calendar weeks
  async getCalendarWeeks(): Promise<number[]> {
    try {
      const response = await api.get("/patients/calendar-weeks");
      return response.data.calendar_weeks;
    } catch (error) {
      console.error("Failed to fetch available calendar weeks:", error);
      throw error;
    }
  },
};
