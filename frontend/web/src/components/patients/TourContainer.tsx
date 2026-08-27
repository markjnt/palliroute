import React, { useState } from "react";
import {
  Box,
  Paper,
  Divider,
  IconButton,
  Collapse,
  Alert,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import {
  Patient,
  Appointment,
  Weekday,
  Employee,
  Route,
} from "../../types/models";
import { getColorForTour } from "@palliroute/shared";
import TourSections from "./TourSections";
import { TourHeader } from "./tour/TourHeader";
import { TourStats } from "./tour/TourStats";
import { TourControls } from "./tour/TourControls";
import { TourSummary } from "./tour/TourSummary";
import {
  usePatientManagement,
  useRouteManagement,
  useRouteVisibility,
} from "../../hooks";
import { useRouteHoverStore } from "@palliroute/stores";

interface TourContainerProps {
  employee: Employee;
  patients: Patient[];
  appointments: Appointment[];
  selectedDay: Weekday;
  routes: Route[];
}

export const TourContainer: React.FC<TourContainerProps> = ({
  employee,
  patients,
  appointments,
  selectedDay,
  routes,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Custom hooks for business logic
  const patientManagement = usePatientManagement({
    patients,
    appointments,
    selectedDay,
    employeeId: employee.id,
  });

  const routeManagement = useRouteManagement({
    selectedDay,
    employeeId: employee.id,
  });

  const routeVisibility = useRouteVisibility({
    routeId: routes.find(
      (r) =>
        r.employee_id === employee.id &&
        r.weekday === selectedDay.toLowerCase(),
    )?.id,
  });

  // Find the route for this employee and day
  const route = routes.find(
    (r) =>
      r.employee_id === employee.id && r.weekday === selectedDay.toLowerCase(),
  );
  const routeId = route?.id;
  const isVisible = routeVisibility.isVisible;
  const hoveredRouteId = useRouteHoverStore((s) => s.hoveredRouteId);
  const hoverRoute = useRouteHoverStore((s) => s.hoverRoute);
  const unhoverRoute = useRouteHoverStore((s) => s.unhoverRoute);
  const isHovered = routeId != null && hoveredRouteId === routeId;

  // Get patients and appointments using custom hook
  const {
    hbPatients,
    tkPatients,
    naPatients,
    emptyTypePatients,
    tourEmployeePatients,
    normalTkPatients,
    tourEmployeeTkPatients,
    getSortedRoutePatients,
    getPatientAppointments,
    isTourEmployeeAppointment,
    hasAppointmentsForDay,
    hbAppointments,
    naAppointments,
    normalRouteAppointments,
    tourEmployeeAppointments,
    normalTkAppointments,
    tourEmployeeTkAppointments,
    normalEmptyTypeAppointments,
    tourEmployeeEmptyTypeAppointments,
  } = patientManagement;

  const sortedRoutePatients = getSortedRoutePatients(route);

  const handleOptimizeRoute = async () => {
    await routeManagement.optimizeRoute();
  };

  const tourColor = employee.id ? getColorForTour(employee.id) : "#9E9E9E";

  return (
    <Paper
      id={`tour-container-${employee.id}`}
      elevation={isHovered ? 6 : 2}
      onMouseEnter={() => {
        if (routeId != null) hoverRoute(routeId);
      }}
      onMouseLeave={unhoverRoute}
      sx={{
        mb: 1,
        p: 2,
        transition: "all 0.3s ease",
        width: "100%",
        height: "fit-content",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: expanded ? "auto" : "100px",
        borderWidth: 2.5,
        borderColor: tourColor,
        borderStyle: "solid",
        backgroundColor: "background.paper",
        boxShadow: isHovered ? `0 0 0 2px ${tourColor}` : undefined,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <TourHeader employee={employee} route={route} />

          <TourStats employee={employee} route={route} />

          <TourControls
            expanded={expanded}
            optimizeState={{ isOptimizing: routeManagement.isOptimizing }}
            tourPatientsCount={
              sortedRoutePatients.length + emptyTypePatients.length
            }
            routeId={routeId}
            isVisible={isVisible}
            onOptimizeRoute={handleOptimizeRoute}
            onToggleVisibility={routeVisibility.toggleVisibility}
          />
        </Box>

        <IconButton
          onClick={() => setExpanded(!expanded)}
          size="small"
          aria-label={expanded ? "Einklappen" : "Ausklappen"}
          color="primary"
          sx={{ ml: 1 }}
        >
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      {!expanded && (
        <TourSummary
          sortedRoutePatients={sortedRoutePatients}
          normalTkPatients={normalTkPatients}
          emptyTypePatients={emptyTypePatients}
          getPatientAppointments={getPatientAppointments}
        />
      )}

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Divider sx={{ my: 1 }} />

        {hasAppointmentsForDay ? (
          <>
            <TourSections
              sortedRoutePatients={sortedRoutePatients}
              tourEmployeePatients={tourEmployeePatients}
              normalTkPatients={normalTkPatients}
              tourEmployeeTkPatients={tourEmployeeTkPatients}
              emptyTypePatients={emptyTypePatients}
              getPatientAppointments={getPatientAppointments}
              isTourEmployeeAppointment={isTourEmployeeAppointment}
              selectedDay={selectedDay}
              employeeId={employee.id}
              normalRouteAppointments={normalRouteAppointments}
              tourEmployeeAppointments={tourEmployeeAppointments}
              normalTkAppointments={normalTkAppointments}
              tourEmployeeTkAppointments={tourEmployeeTkAppointments}
              normalEmptyTypeAppointments={normalEmptyTypeAppointments}
              tourEmployeeEmptyTypeAppointments={
                tourEmployeeEmptyTypeAppointments
              }
              route={route}
              patients={patients}
            />
          </>
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            Keine Termine für diesen Tag geplant.
          </Alert>
        )}
      </Collapse>
    </Paper>
  );
};
