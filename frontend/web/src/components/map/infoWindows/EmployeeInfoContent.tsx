import React from "react";
import { Box, Typography, Divider, Chip } from "@mui/material";
import NavigationIcon from "@mui/icons-material/Navigation";
import { MarkerData } from "../../../types/mapTypes";
import { Employee, Route } from "../../../types/models";
import { getColorForEmployeeType } from "../../../utils/mapUtils";
import { getColorForTour } from "@palliroute/shared";
import { TourInfoBox } from "./TourInfoBox";

interface EmployeeInfoContentProps {
  marker: MarkerData;
  employees: Employee[];
  routes: Route[];
}

/**
 * Component for displaying employee information in marker info windows
 */
export const EmployeeInfoContent: React.FC<EmployeeInfoContentProps> = ({
  marker,
  employees,
  routes,
}) => {
  const employee = employees.find((e) => e.id === marker.employeeId);
  if (!employee) return null;

  const route = marker.routeId
    ? routes.find((r) => r.id === marker.routeId)
    : routes.find((r) => r.employee_id === employee.id);
  const routeDuration = route?.total_duration ?? 0; // in Minuten
  const workHours = employee.work_hours || 0;
  const targetMinutes = Math.round(420 * (workHours / 100));
  const utilization =
    targetMinutes > 0 ? (routeDuration / targetMinutes) * 100 : undefined;
  const tourColor = employee.id ? getColorForTour(employee.id) : "#888";
  const area = route?.area || employee.area || "";

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          fontWeight: 600,
          mb: 1.25,
          pr: 4.5,
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            color: "#1d1d1f",
            fontSize: "1rem",
            lineHeight: 1.25,
            flexGrow: 1,
          }}
        >
          {marker.title.split(" - ")[0]}
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: "#8E8E93", ml: 1 }}
        >
          {workHours}%
        </Typography>
      </Box>

      {marker.employeeType && (
        <Chip
          label={marker.employeeType}
          size="small"
          sx={{
            mb: 1.25,
            bgcolor: `${getColorForEmployeeType(marker.employeeType)}20`,
            color: getColorForEmployeeType(marker.employeeType),
            fontSize: "0.7rem",
            height: 20,
            fontWeight: 600,
          }}
        />
      )}

      <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1.25 }}>
        {employee.area && (
          <Box sx={{ display: "flex", alignItems: "center", mr: 1, mt: 0.15 }}>
            <NavigationIcon
              fontSize="small"
              sx={{
                mr: 0.5,
                color: "#8E8E93",
                transform: employee.area.includes("Nordkreis")
                  ? "rotate(0deg)"
                  : "rotate(180deg)",
              }}
            />
            <Typography
              variant="body2"
              sx={{ color: "#8E8E93", mr: 1, fontWeight: 600 }}
            >
              {employee.area.includes("Nordkreis") ? "N" : "S"}
            </Typography>
            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 1, height: 20 }}
            />
          </Box>
        )}
        <Typography variant="body2" sx={{ color: "#1d1d1f", fontWeight: 500 }}>
          {employee.street}
          <Box
            component="span"
            sx={{
              display: "block",
              color: "#8E8E93",
              fontWeight: 400,
              fontSize: "0.75rem",
            }}
          >
            {employee.zip_code} {employee.city}
          </Box>
        </Typography>
      </Box>

      {/* TourInfoBox für alle Mitarbeiter */}
      {employee.id && (
        <TourInfoBox
          employeeName=""
          area={area}
          utilization={utilization}
          tourColor={tourColor}
          durationMinutes={routeDuration}
          targetMinutes={targetMinutes}
        />
      )}
    </>
  );
};
