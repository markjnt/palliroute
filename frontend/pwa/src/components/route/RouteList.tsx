import React, { useMemo } from "react";
import { Box, Typography, Chip, Divider } from "@mui/material";
import {
  Phone as PhoneIcon,
  AccessTime as TimeIcon,
} from "@mui/icons-material";
import { useUserStore } from "../../stores/useUserStore";
import { useWeekdayStore } from "../../stores/useWeekdayStore";
import { useAdditionalRoutesStore } from "../../stores/useAdditionalRoutesStore";
import { useEmployees } from "../../services/queries/useEmployees";
import { usePatients } from "../../services/queries/usePatients";
import {
  useAppointmentsByWeekday,
  useSetAppointmentCompleted,
} from "../../services/queries/useAppointments";
import { useRoutes } from "../../services/queries/useRoutes";
import { findEmployeeDayRoute } from "../../utils/mapUtils";
import { getOwnRouteOrder } from "@palliroute/shared";
import { Weekday } from "../../types/models";
import RouteStopItem from "./RouteStopItem";
import { AppointmentCheckControl } from "./AppointmentCheckControl";
import { StopCallButton, StopInfoIcon } from "./StopActionButtons";
import { callPhone } from "./stopContactActions";
import { useNrwpHolidayForTourDay } from "../../hooks/useNrwpHolidayForTourDay";

interface RouteStop {
  id: number;
  position: number;
  patientName: string;
  address: string;
  visitType: string;
  time?: string;
  phone1?: string;
  phone2?: string;
  info?: string;
  completed?: boolean;
  responsibleEmployeeName?: string; // For tour_employee appointments: shows "Zuständig: [Name]"
  responsibleEmployeeId?: number;
  tourEmployeeName?: string; // For responsible employee: shows "Ursprungstour: [Name]"
  tourEmployeeId?: number;
  isTourEmployeeAppointment?: boolean; // Mark tour_employee appointments for styling
  originEmployeeName?: string; // For replacement appointments: shows "Ursprünglich (Vertretung): [Name]"
  otherResponsibleEmployees?: Array<{
    employee: { id?: number; first_name: string; last_name: string };
    appointmentId: number;
  }>; // All other appointments for the same patient on the same day
}

interface RouteListProps {
  onShowAdditionalRoute?: () => void;
}

export const RouteList: React.FC<RouteListProps> = ({
  onShowAdditionalRoute,
}) => {
  const { selectedUserId } = useUserStore();
  const { selectedWeekday } = useWeekdayStore();
  const { isAreaTourDay } = useNrwpHolidayForTourDay(
    selectedWeekday as Weekday,
  );
  const { addEmployee } = useAdditionalRoutesStore();

  // Data hooks
  const { data: employees = [] } = useEmployees();
  const { data: patients = [] } = usePatients();
  const { data: appointments = [] } = useAppointmentsByWeekday(
    selectedWeekday as Weekday,
  );
  const { data: routes = [] } = useRoutes({
    weekday: selectedWeekday as Weekday,
  });
  const setAppointmentCompleted = useSetAppointmentCompleted();

  const handleToggleCompleted = (appointmentId: number, completed: boolean) => {
    if (!appointmentId) return;
    setAppointmentCompleted.mutate({ appointmentId, completed });
  };

  const showAsAdditionalRoute = (employeeId?: number) => {
    if (!employeeId || Number(employeeId) === Number(selectedUserId)) return;
    addEmployee(employeeId);
    onShowAdditionalRoute?.();
  };

  const employeeLinkSx = {
    color: "#007AFF",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    borderRadius: 1,
    px: 0.5,
    py: 0.25,
    transition: "background-color 0.2s ease",
    "&:hover": {
      bgcolor: "rgba(0, 122, 255, 0.1)",
    },
    "&:active": {
      bgcolor: "rgba(0, 122, 255, 0.2)",
    },
  };

  // Get German weekday name
  const getGermanWeekday = (weekday: string): string => {
    const weekdayMap: Record<string, string> = {
      monday: "Montag",
      tuesday: "Dienstag",
      wednesday: "Mittwoch",
      thursday: "Donnerstag",
      friday: "Freitag",
      saturday: "Samstag",
      sunday: "Sonntag",
    };
    return weekdayMap[weekday] || weekday;
  };

  const ownRoute = useMemo(
    () =>
      findEmployeeDayRoute(
        routes,
        selectedUserId,
        selectedWeekday,
        isAreaTourDay,
      ),
    [routes, selectedUserId, selectedWeekday, isAreaTourDay],
  );
  const visibleRoutes = useMemo(() => (ownRoute ? [ownRoute] : []), [ownRoute]);

  // Create route stops for all visible routes
  const routeStops = useMemo(() => {
    const stops: RouteStop[] = [];

    if (!selectedUserId) return stops;

    visibleRoutes.forEach((route) => {
      const routeOrder = getOwnRouteOrder(route);

      routeOrder.forEach((appointmentId, index) => {
        const appointment = appointments.find((a) => a.id === appointmentId);
        if (appointment) {
          const patient = patients.find((p) => p.id === appointment.patient_id);
          if (patient) {
            // Determine if this is a tour_employee appointment (current user is tour_employee_id but not employee_id)
            const isTourEmployeeAppointment =
              selectedUserId &&
              appointment.tour_employee_id === selectedUserId &&
              appointment.employee_id !== selectedUserId;

            // Get responsible employee name (for tour_employee appointments)
            const responsibleEmployee =
              isTourEmployeeAppointment && appointment.employee_id
                ? employees.find((e) => e.id === appointment.employee_id)
                : null;

            // Get all appointments for this patient on the selected day
            const allDayAppointments = appointments.filter(
              (app) =>
                app.patient_id === patient.id &&
                app.weekday === selectedWeekday,
            );

            // Check if there are multiple appointments for this patient on the same day (Multi-Assignment)
            const hasMultipleAppointments = allDayAppointments.length > 1;

            // Get tour employee name (for responsible employee appointments)
            // Show tour employee if:
            // 1. tour_employee_id is set
            // 2. Not a tour employee appointment itself
            // 3. Either tour_employee_id is different from employee_id OR there are multiple appointments (Multi-Assignment)
            const tourEmployee =
              !isTourEmployeeAppointment &&
              appointment.tour_employee_id &&
              (appointment.tour_employee_id !== appointment.employee_id ||
                hasMultipleAppointments)
                ? employees.find((e) => e.id === appointment.tour_employee_id)
                : null;

            // Get origin employee name (only when different from current employee)
            const showOriginEmployee =
              appointment.origin_employee_id &&
              appointment.origin_employee_id !== appointment.employee_id;
            const originEmployee = showOriginEmployee
              ? employees.find((e) => e.id === appointment.origin_employee_id)
              : null;

            // Get other responsible employees (alle weiteren Termine für denselben Patienten am selben Tag)
            // These are all appointments for the same patient on the same day, excluding the current appointment
            // In Multi-Assignment scenarios, the tour_employee_id may also appear in "Gemeinsam mit"
            const otherResponsibleEmployees =
              allDayAppointments.length > 1
                ? allDayAppointments
                    .filter(
                      (app) =>
                        app.id !== appointment.id &&
                        app.employee_id !== appointment.employee_id &&
                        app.employee_id !== null &&
                        app.employee_id !== undefined,
                    )
                    .map((app) => {
                      const emp = employees.find(
                        (e) => e.id === app.employee_id,
                      );
                      return emp
                        ? { employee: emp, appointmentId: app.id || 0 }
                        : null;
                    })
                    .filter(
                      (
                        item,
                      ): item is {
                        employee: (typeof employees)[0];
                        appointmentId: number;
                      } => item !== null,
                    )
                    .filter(
                      (item, index, self) =>
                        index ===
                        self.findIndex(
                          (t) => t.employee.id === item.employee.id,
                        ),
                    )
                : [];

            stops.push({
              id: appointmentId,
              position: index + 1,
              patientName: `${patient.first_name} ${patient.last_name}`,
              address: `${patient.street}, ${patient.zip_code} ${patient.city}`,
              visitType: appointment.visit_type,
              time: appointment.time,
              phone1: patient.phone1,
              phone2: patient.phone2,
              info: appointment.info,
              completed: Boolean(appointment.completed),
              responsibleEmployeeName: responsibleEmployee
                ? `${responsibleEmployee.first_name} ${responsibleEmployee.last_name}`
                : undefined,
              responsibleEmployeeId: responsibleEmployee?.id,
              tourEmployeeName: tourEmployee
                ? `${tourEmployee.first_name} ${tourEmployee.last_name}`
                : undefined,
              tourEmployeeId: tourEmployee?.id,
              originEmployeeName: originEmployee
                ? `${originEmployee.first_name} ${originEmployee.last_name}`
                : undefined,
              otherResponsibleEmployees:
                otherResponsibleEmployees.length > 0
                  ? otherResponsibleEmployees
                  : undefined,
            });
          }
        }
      });
    });

    return stops;
  }, [
    visibleRoutes,
    employees,
    patients,
    appointments,
    selectedUserId,
    selectedWeekday,
  ]);

  const displayedStops = useMemo(() => {
    return routeStops.map((stop, idx) => ({ ...stop, position: idx + 1 }));
  }, [routeStops]);

  // Get tour employee stops (appointments where tour_employee_id matches but not in route)
  const tourEmployeeStops = useMemo(() => {
    const stops: RouteStop[] = [];

    if (!selectedUserId || isAreaTourDay) return stops;

    // Get all appointment IDs that are in routes
    const routeAppointmentIds = new Set<number>();
    visibleRoutes.forEach((route) => {
      const routeOrder = getOwnRouteOrder(route);
      routeOrder.forEach((appointmentId) => {
        routeAppointmentIds.add(appointmentId);
      });
    });

    // Get all patient IDs that are in normal routes (to filter out duplicates)
    const normalRoutePatientIds = new Set<number>();
    visibleRoutes.forEach((route) => {
      const routeOrder = getOwnRouteOrder(route);
      routeOrder.forEach((appointmentId) => {
        const appointment = appointments.find((a) => a.id === appointmentId);
        if (appointment && appointment.patient_id) {
          normalRoutePatientIds.add(appointment.patient_id);
        }
      });
    });

    // Find appointments where tour_employee_id matches but appointment is not in route
    // Filter out tour employee appointments that already have a normal route appointment for the same patient
    const tourEmployeeApps = appointments.filter(
      (a) =>
        a.tour_employee_id === selectedUserId &&
        a.employee_id !== selectedUserId &&
        (a.visit_type === "HB" || a.visit_type === "NA") &&
        a.weekday === selectedWeekday &&
        a.id !== undefined &&
        !routeAppointmentIds.has(a.id) &&
        !normalRoutePatientIds.has(a.patient_id), // Filter out if patient already has a normal route appointment
    );

    // Group appointments by patient_id to avoid duplicates (like in web version)
    const appointmentsByPatient = new Map<number, typeof tourEmployeeApps>();
    tourEmployeeApps.forEach((app) => {
      const patientId = app.patient_id;
      if (!appointmentsByPatient.has(patientId)) {
        appointmentsByPatient.set(patientId, []);
      }
      appointmentsByPatient.get(patientId)!.push(app);
    });

    // Create one stop per patient (grouped)
    Array.from(appointmentsByPatient.entries()).forEach(
      ([patientId, patientAppts]) => {
        const patient = patients.find((p) => p.id === patientId);
        if (!patient) return;

        // Use the first appointment for display
        const appointment = patientAppts[0];

        const responsibleEmployee = appointment.employee_id
          ? employees.find((e) => e.id === appointment.employee_id)
          : null;
        const showOriginEmployee =
          appointment.origin_employee_id &&
          appointment.origin_employee_id !== appointment.employee_id;
        const originEmployee = showOriginEmployee
          ? employees.find((e) => e.id === appointment.origin_employee_id)
          : null;

        // Get all appointments for this patient on the selected day
        const allDayAppointments = appointments.filter(
          (app) =>
            app.patient_id === patient.id && app.weekday === selectedWeekday,
        );

        // Get other responsible employees (alle weiteren Termine für denselben Patienten am selben Tag)
        const otherResponsibleEmployees =
          allDayAppointments.length > 1
            ? allDayAppointments
                .filter(
                  (app) =>
                    app.id !== appointment.id &&
                    app.employee_id !== appointment.employee_id &&
                    app.employee_id !== null &&
                    app.employee_id !== undefined,
                )
                .map((app) => {
                  const emp = employees.find((e) => e.id === app.employee_id);
                  return emp
                    ? { employee: emp, appointmentId: app.id || 0 }
                    : null;
                })
                .filter(
                  (
                    item,
                  ): item is {
                    employee: (typeof employees)[0];
                    appointmentId: number;
                  } => item !== null,
                )
                .filter(
                  (item, index, self) =>
                    index ===
                    self.findIndex((t) => t.employee.id === item.employee.id),
                )
            : [];

        stops.push({
          id: appointment.id || 0,
          position: 0, // No position for tour employee stops
          patientName: `${patient.first_name} ${patient.last_name}`,
          address: `${patient.street}, ${patient.zip_code} ${patient.city}`,
          visitType: appointment.visit_type,
          time: appointment.time,
          phone1: patient.phone1,
          phone2: patient.phone2,
          info: appointment.info,
          completed: Boolean(appointment.completed),
          responsibleEmployeeName: responsibleEmployee
            ? `${responsibleEmployee.first_name} ${responsibleEmployee.last_name}`
            : undefined,
          responsibleEmployeeId: responsibleEmployee?.id,
          isTourEmployeeAppointment: true, // Mark as tour employee appointment
          originEmployeeName: originEmployee
            ? `${originEmployee.first_name} ${originEmployee.last_name}`
            : undefined,
          otherResponsibleEmployees:
            otherResponsibleEmployees.length > 0
              ? otherResponsibleEmployees
              : undefined,
        });
      },
    );

    return stops;
  }, [
    appointments,
    patients,
    employees,
    selectedUserId,
    selectedWeekday,
    visibleRoutes,
    isAreaTourDay,
  ]);

  // Get TK appointments (phone calls) for the selected employee/area and day
  const tkAppointments = useMemo(() => {
    if (!selectedUserId) return [];

    const allTkApps = appointments.filter((a) => {
      if (isAreaTourDay) {
        return (
          a.weekday === selectedWeekday &&
          Boolean(ownRoute?.area) &&
          a.area === ownRoute?.area &&
          a.visit_type === "TK"
        );
      }
      return (
        a.weekday === selectedWeekday &&
        a.visit_type === "TK" &&
        (a.employee_id === selectedUserId ||
          a.tour_employee_id === selectedUserId)
      );
    });

    const normalTkApps = allTkApps.filter((a) => {
      if (isAreaTourDay) return true;
      return !(
        a.tour_employee_id === selectedUserId &&
        a.employee_id !== selectedUserId
      );
    });

    const tourEmployeeTkApps = isAreaTourDay
      ? []
      : allTkApps.filter(
          (a) =>
            a.tour_employee_id === selectedUserId &&
            a.employee_id !== selectedUserId,
        );

    // Get all patient IDs that have normal TK appointments (to filter out duplicates)
    const normalTkPatientIds = new Set(
      normalTkApps.map((app) => app.patient_id),
    );

    // Filter out tour employee TK appointments that already have a normal TK appointment for the same patient
    const filteredTourEmployeeTkApps = tourEmployeeTkApps.filter(
      (app) => !normalTkPatientIds.has(app.patient_id),
    );

    // Group normal TK appointments by patient_id to avoid duplicates
    const normalTkByPatient = new Map<number, typeof normalTkApps>();
    normalTkApps.forEach((app) => {
      const patientId = app.patient_id;
      if (!normalTkByPatient.has(patientId)) {
        normalTkByPatient.set(patientId, []);
      }
      normalTkByPatient.get(patientId)!.push(app);
    });

    // Group tour employee TK appointments by patient_id to avoid duplicates
    const tourEmployeeTkByPatient = new Map<
      number,
      typeof filteredTourEmployeeTkApps
    >();
    filteredTourEmployeeTkApps.forEach((app) => {
      const patientId = app.patient_id;
      if (!tourEmployeeTkByPatient.has(patientId)) {
        tourEmployeeTkByPatient.set(patientId, []);
      }
      tourEmployeeTkByPatient.get(patientId)!.push(app);
    });

    // Get all unique patient IDs
    const allTkPatientIds = new Set([
      ...normalTkByPatient.keys(),
      ...tourEmployeeTkByPatient.keys(),
    ]);

    // Build result array - one entry per patient
    const result: Array<{
      id: number;
      patientName: string;
      phone1?: string;
      phone2?: string;
      time?: string;
      info?: string;
      completed?: boolean;
      responsibleEmployeeName?: string;
      responsibleEmployeeId?: number;
      tourEmployeeName?: string;
      tourEmployeeId?: number;
      isTourEmployeeAppointment: boolean;
      originEmployeeName?: string;
      otherResponsibleEmployees?: Array<{
        employee: (typeof employees)[0];
        appointmentId: number;
      }>;
    }> = [];

    allTkPatientIds.forEach((patientId) => {
      const normalTkAppts = normalTkByPatient.get(patientId) || [];
      const tourEmployeeTkAppts = tourEmployeeTkByPatient.get(patientId) || [];

      // If there are normal TK appointments, show them and include tour employee appointments
      if (normalTkAppts.length > 0) {
        // Use first appointment for display (grouped by patient)
        const appointment = normalTkAppts[0];
        const patient = patients.find((p) => p.id === appointment.patient_id);
        if (!patient) return;

        const tourEmployee = appointment.tour_employee_id
          ? employees.find((e) => e.id === appointment.tour_employee_id)
          : null;

        const showOriginEmployee =
          appointment.origin_employee_id &&
          appointment.origin_employee_id !== appointment.employee_id;
        const originEmployee = showOriginEmployee
          ? employees.find((e) => e.id === appointment.origin_employee_id)
          : null;

        // Get all appointments for this patient on the selected day
        const allDayAppointments = appointments.filter(
          (app) =>
            app.patient_id === patient.id && app.weekday === selectedWeekday,
        );

        // Get other responsible employees (alle weiteren Termine für denselben Patienten am selben Tag)
        const otherResponsibleEmployees =
          allDayAppointments.length > 1
            ? allDayAppointments
                .filter(
                  (app) =>
                    app.id !== appointment.id &&
                    app.employee_id !== appointment.employee_id &&
                    app.employee_id !== null &&
                    app.employee_id !== undefined,
                )
                .map((app) => {
                  const emp = employees.find((e) => e.id === app.employee_id);
                  return emp
                    ? { employee: emp, appointmentId: app.id || 0 }
                    : null;
                })
                .filter(
                  (
                    item,
                  ): item is {
                    employee: (typeof employees)[0];
                    appointmentId: number;
                  } => item !== null,
                )
                .filter(
                  (item, index, self) =>
                    index ===
                    self.findIndex((t) => t.employee.id === item.employee.id),
                )
            : [];

        result.push({
          id: appointment.id || 0,
          patientName: `${patient.first_name} ${patient.last_name}`,
          phone1: patient.phone1,
          phone2: patient.phone2,
          time: appointment.time,
          info: appointment.info,
          completed: Boolean(appointment.completed),
          responsibleEmployeeName: undefined,
          tourEmployeeName: tourEmployee
            ? `${tourEmployee.first_name} ${tourEmployee.last_name}`
            : undefined,
          tourEmployeeId: tourEmployee?.id,
          isTourEmployeeAppointment: false,
          originEmployeeName: originEmployee
            ? `${originEmployee.first_name} ${originEmployee.last_name}`
            : undefined,
          otherResponsibleEmployees:
            otherResponsibleEmployees.length > 0
              ? otherResponsibleEmployees
              : undefined,
        });
      } else if (tourEmployeeTkAppts.length > 0) {
        // Only tour employee TK appointments (no normal ones)
        // Use first appointment for display (grouped by patient)
        const appointment = tourEmployeeTkAppts[0];
        const patient = patients.find((p) => p.id === appointment.patient_id);
        if (!patient) return;

        const responsibleEmployee = appointment.employee_id
          ? employees.find((e) => e.id === appointment.employee_id)
          : null;

        const showOriginEmployee =
          appointment.origin_employee_id &&
          appointment.origin_employee_id !== appointment.employee_id;
        const originEmployee = showOriginEmployee
          ? employees.find((e) => e.id === appointment.origin_employee_id)
          : null;

        // Get all appointments for this patient on the selected day
        const allDayAppointments = appointments.filter(
          (app) =>
            app.patient_id === patient.id && app.weekday === selectedWeekday,
        );

        // Get other responsible employees (alle weiteren Termine für denselben Patienten am selben Tag)
        const otherResponsibleEmployees =
          allDayAppointments.length > 1
            ? allDayAppointments
                .filter(
                  (app) =>
                    app.id !== appointment.id &&
                    app.employee_id !== appointment.employee_id &&
                    app.employee_id !== null &&
                    app.employee_id !== undefined,
                )
                .map((app) => {
                  const emp = employees.find((e) => e.id === app.employee_id);
                  return emp
                    ? { employee: emp, appointmentId: app.id || 0 }
                    : null;
                })
                .filter(
                  (
                    item,
                  ): item is {
                    employee: (typeof employees)[0];
                    appointmentId: number;
                  } => item !== null,
                )
                .filter(
                  (item, index, self) =>
                    index ===
                    self.findIndex((t) => t.employee.id === item.employee.id),
                )
            : [];

        result.push({
          id: appointment.id || 0,
          patientName: `${patient.first_name} ${patient.last_name}`,
          phone1: patient.phone1,
          phone2: patient.phone2,
          time: appointment.time,
          info: appointment.info,
          completed: Boolean(appointment.completed),
          responsibleEmployeeName: responsibleEmployee
            ? `${responsibleEmployee.first_name} ${responsibleEmployee.last_name}`
            : undefined,
          responsibleEmployeeId: responsibleEmployee?.id,
          tourEmployeeName: undefined,
          isTourEmployeeAppointment: true,
          originEmployeeName: originEmployee
            ? `${originEmployee.first_name} ${originEmployee.last_name}`
            : undefined,
          otherResponsibleEmployees:
            otherResponsibleEmployees.length > 0
              ? otherResponsibleEmployees
              : undefined,
        });
      }
    });

    return result.sort((a, b) => {
      // Sortiere: tour_employee Termine ans Ende
      if (a.isTourEmployeeAppointment && !b.isTourEmployeeAppointment) return 1;
      if (!a.isTourEmployeeAppointment && b.isTourEmployeeAppointment)
        return -1;
      return 0;
    });
  }, [
    appointments,
    selectedUserId,
    isAreaTourDay,
    ownRoute?.area,
    selectedWeekday,
    patients,
    employees,
  ]);

  if (!selectedUserId) {
    return (
      <Box sx={{ px: 3, pb: 2 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: "1px solid rgba(0, 0, 0, 0.08)",
            background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)",
            textAlign: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Bitte wählen Sie einen Mitarbeiter aus
          </Typography>
        </Box>
      </Box>
    );
  }

  const hasContent =
    displayedStops.length > 0 ||
    tourEmployeeStops.length > 0 ||
    tkAppointments.length > 0;

  if (!hasContent) {
    return (
      <Box sx={{ px: 3, pb: 2 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: "1px solid rgba(0, 0, 0, 0.08)",
            background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)",
            textAlign: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Keine Route für {getGermanWeekday(selectedWeekday)}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 3, pb: 2 }}>
      {(displayedStops.length > 0 || tourEmployeeStops.length > 0) && (
        <Box
          sx={{
            background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)",
            borderRadius: 2,
            border: "1px solid rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
          }}
        >
          {displayedStops.map((stop, index) => (
            <React.Fragment key={stop.id}>
              <RouteStopItem
                stop={stop}
                onShowAdditionalRoute={onShowAdditionalRoute}
                onToggleCompleted={handleToggleCompleted}
              />
              {index < displayedStops.length - 1 && (
                <Divider sx={{ mx: 1.5 }} />
              )}
            </React.Fragment>
          ))}

          {tourEmployeeStops.length > 0 && (
            <>
              {displayedStops.length > 0 && <Divider sx={{ mx: 1.5, my: 1 }} />}
              {tourEmployeeStops.map((stop, index) => (
                <React.Fragment key={`tour-${stop.id}`}>
                  <RouteStopItem
                    stop={stop}
                    onShowAdditionalRoute={onShowAdditionalRoute}
                    onToggleCompleted={handleToggleCompleted}
                  />
                  {index < tourEmployeeStops.length - 1 && (
                    <Divider sx={{ mx: 1.5 }} />
                  )}
                </React.Fragment>
              ))}
            </>
          )}
        </Box>
      )}

      {tkAppointments.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Box
            sx={{
              background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)",
              borderRadius: 2,
              border: "1px solid rgba(0, 0, 0, 0.08)",
              overflow: "hidden",
            }}
          >
            {tkAppointments.map((tkApp, index) => {
              const tkCompleted = Boolean(tkApp.completed);
              return (
                <Box
                  key={tkApp.id}
                  sx={{
                    opacity: tkApp.isTourEmployeeAppointment
                      ? 0.5
                      : tkCompleted
                        ? 0.72
                        : 1,
                    filter: tkApp.isTourEmployeeAppointment
                      ? "grayscale(0.3)"
                      : "none",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "stretch",
                      p: { xs: 1.25, sm: 1.5 },
                      mx: 0.5,
                      my: 0.25,
                      borderRadius: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: { xs: 32, sm: 36 },
                        height: { xs: 32, sm: 36 },
                        borderRadius: "50%",
                        bgcolor: "#4CAF50",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mr: { xs: 1.5, sm: 2 },
                        flexShrink: 0,
                        alignSelf: "center",
                        boxShadow: "0 2px 8px rgba(76, 175, 80, 0.25)",
                      }}
                    >
                      <PhoneIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />
                    </Box>

                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: tkCompleted ? "#8E8E93" : "#1d1d1f",
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                          lineHeight: 1.3,
                          textDecoration: tkCompleted ? "line-through" : "none",
                          mb: 0.75,
                        }}
                      >
                        {tkApp.patientName}
                      </Typography>

                      {tkApp.responsibleEmployeeName && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            variant="caption"
                            onClick={() =>
                              showAsAdditionalRoute(tkApp.responsibleEmployeeId)
                            }
                            sx={employeeLinkSx}
                          >
                            Zuständig: {tkApp.responsibleEmployeeName}
                          </Typography>
                        </Box>
                      )}

                      {tkApp.tourEmployeeName && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            variant="caption"
                            onClick={() =>
                              showAsAdditionalRoute(tkApp.tourEmployeeId)
                            }
                            sx={employeeLinkSx}
                          >
                            Ursprungstour: {tkApp.tourEmployeeName}
                          </Typography>
                        </Box>
                      )}

                      {tkApp.originEmployeeName && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#007AFF",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            Ursprünglich (Vertretung):{" "}
                            {tkApp.originEmployeeName}
                          </Typography>
                        </Box>
                      )}

                      {(tkApp.phone1 || tkApp.phone2) && (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                            mt: 0.5,
                          }}
                        >
                          {tkApp.phone1 && (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                                minWidth: 0,
                              }}
                            >
                              <StopCallButton phone={tkApp.phone1} />
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "#8E8E93",
                                  fontSize: { xs: "0.7rem", sm: "0.75rem" },
                                  cursor: "pointer",
                                  lineHeight: 1.35,
                                }}
                                onClick={() => callPhone(tkApp.phone1!)}
                              >
                                {tkApp.phone1}
                              </Typography>
                            </Box>
                          )}
                          {tkApp.phone2 && (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                                minWidth: 0,
                              }}
                            >
                              <StopCallButton phone={tkApp.phone2} />
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "#8E8E93",
                                  fontSize: { xs: "0.7rem", sm: "0.75rem" },
                                  cursor: "pointer",
                                  lineHeight: 1.35,
                                }}
                                onClick={() => callPhone(tkApp.phone2!)}
                              >
                                {tkApp.phone2}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}

                      {tkApp.time && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mt: 0.5,
                          }}
                        >
                          <TimeIcon
                            sx={{
                              fontSize: { xs: 13, sm: 14 },
                              color: "#8E8E93",
                              mr: 0.5,
                            }}
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#8E8E93",
                              fontSize: { xs: "0.7rem", sm: "0.75rem" },
                            }}
                          >
                            {tkApp.time}
                          </Typography>
                        </Box>
                      )}

                      {tkApp.info && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                            minWidth: 0,
                            mt: 0.5,
                          }}
                        >
                          <StopInfoIcon />
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#007AFF",
                              fontSize: "0.75rem",
                              bgcolor: "rgba(0, 122, 255, 0.1)",
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                              lineHeight: 1.35,
                            }}
                          >
                            {tkApp.info}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Box
                      sx={{
                        ml: 0.75,
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.5,
                        minWidth: 44,
                        alignSelf: "flex-start",
                      }}
                    >
                      <Chip
                        label="TK"
                        size="small"
                        sx={{
                          bgcolor: "rgba(76, 175, 80, 0.15)",
                          color: "#4CAF50",
                          fontSize: { xs: "0.7rem", sm: "0.75rem" },
                          height: { xs: 18, sm: 20 },
                          fontWeight: 600,
                          border: "1px solid rgba(76, 175, 80, 0.3)",
                        }}
                      />
                      <AppointmentCheckControl
                        completed={tkCompleted}
                        onToggle={() =>
                          handleToggleCompleted(tkApp.id, !tkCompleted)
                        }
                      />
                    </Box>
                  </Box>

                  {index < tkAppointments.length - 1 && (
                    <Divider sx={{ mx: 2 }} />
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};
