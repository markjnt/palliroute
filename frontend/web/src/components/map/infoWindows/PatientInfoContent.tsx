import React from "react";
import { Box, Typography, Chip } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PhoneIcon from "@mui/icons-material/Phone";
import InfoIcon from "@mui/icons-material/Info";
import { MarkerData } from "../../../types/mapTypes";
import { Appointment, Employee, Patient, Route } from "../../../types/models";
import { getColorForVisitType } from "../../../utils/mapUtils";
import { getColorForTour } from "@palliroute/shared";
import { TourInfoBox } from "./TourInfoBox";

const visitTypeLabels: Record<string, string> = {
  HB: "Hausbesuch",
  TK: "Telefonkontakt",
  NA: "Neuaufnahme",
};

const openMaps = (address: string) => {
  window.open(
    `https://maps.google.com/?q=${encodeURIComponent(address)}`,
    "_blank",
  );
};

interface PatientInfoContentProps {
  marker: MarkerData;
  patients: Patient[];
  appointments: Appointment[];
  routes: Route[];
  employees: Employee[];
}

export const PatientInfoContent: React.FC<PatientInfoContentProps> = ({
  marker,
  patients,
  appointments,
  routes,
  employees,
}) => {
  const patient = patients.find((p) => p.id === marker.patientId);
  if (!patient) return null;

  const appointment =
    appointments.find((a) => a.id === marker.appointmentId) ||
    appointments.find((a) => a.patient_id === patient.id);

  const route = marker.routeId
    ? routes.find((r) => r.id === marker.routeId)
    : undefined;
  const employee = appointment?.employee_id
    ? employees.find((e) => e.id === appointment.employee_id)
    : route?.employee_id
      ? employees.find((e) => e.id === route.employee_id)
      : undefined;
  const tourColor = employee?.id ? getColorForTour(employee.id) : "#888";
  const area = marker.routeArea || patient.area || "";

  let utilization: number | undefined;
  let durationMinutes: number | undefined;
  let targetMinutes: number | undefined;
  if (route && route.total_duration && route.employee_id) {
    const routeEmployee = employees.find((e) => e.id === route.employee_id);
    if (routeEmployee) {
      const workHours = routeEmployee.work_hours || 0;
      targetMinutes = Math.round(420 * (workHours / 100));
      durationMinutes = route.total_duration;
      utilization =
        targetMinutes > 0 ? (durationMinutes / targetMinutes) * 100 : undefined;
    }
  }

  const address = `${patient.street}, ${patient.zip_code} ${patient.city}`;
  const visitType = marker.visitType || appointment?.visit_type;

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          mb: 1.25,
          pr: 4.5,
        }}
      >
        {marker.routePosition ? (
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              bgcolor: tourColor !== "#888" ? tourColor : "#007AFF",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.8rem",
              fontWeight: 700,
              flexShrink: 0,
              mt: 0.15,
            }}
          >
            {marker.routePosition}
          </Box>
        ) : null}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              color: "#1d1d1f",
              lineHeight: 1.25,
              fontSize: "1rem",
            }}
          >
            {patient.first_name} {patient.last_name}
          </Typography>
          {visitType ? (
            <Chip
              label={visitTypeLabels[visitType] || visitType}
              size="small"
              sx={{
                mt: 0.5,
                bgcolor: `${getColorForVisitType(visitType)}20`,
                color: getColorForVisitType(visitType),
                fontSize: "0.7rem",
                height: 20,
                fontWeight: 600,
              }}
            />
          ) : null}
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1.25 }}>
        <LocationOnIcon
          sx={{ fontSize: 18, color: "#8E8E93", mr: 1.25, mt: 0.15 }}
        />
        <Typography
          variant="body2"
          sx={{ color: "#1d1d1f", fontWeight: 500, cursor: "pointer" }}
          onClick={() => openMaps(address)}
        >
          {patient.street}
          <Box
            component="span"
            sx={{
              display: "block",
              color: "#8E8E93",
              fontWeight: 400,
              fontSize: "0.75rem",
            }}
          >
            {patient.zip_code} {patient.city}
          </Box>
        </Typography>
      </Box>

      {appointment?.time ? (
        <Box sx={{ display: "flex", alignItems: "center", mb: 1.25 }}>
          <ScheduleIcon sx={{ fontSize: 18, color: "#8E8E93", mr: 1.25 }} />
          <Typography
            variant="body2"
            sx={{ color: "#1d1d1f", fontWeight: 500 }}
          >
            {appointment.time} Uhr
          </Typography>
        </Box>
      ) : null}

      {(patient.phone1 || patient.phone2) && (
        <Box
          sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1.25 }}
        >
          {patient.phone1 ? (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <PhoneIcon sx={{ fontSize: 18, color: "#8E8E93", mr: 1.25 }} />
              <Typography variant="body2" sx={{ color: "#1d1d1f" }}>
                {patient.phone1}
              </Typography>
            </Box>
          ) : null}
          {patient.phone2 ? (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <PhoneIcon sx={{ fontSize: 18, color: "#8E8E93", mr: 1.25 }} />
              <Typography variant="body2" sx={{ color: "#1d1d1f" }}>
                {patient.phone2}
              </Typography>
            </Box>
          ) : null}
        </Box>
      )}

      {appointment?.info ? (
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1.25 }}>
          <InfoIcon
            sx={{ fontSize: 18, color: "#007AFF", mr: 1.25, mt: 0.15 }}
          />
          <Typography
            variant="body2"
            sx={{
              color: "#007AFF",
              bgcolor: "rgba(0, 122, 255, 0.1)",
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontWeight: 500,
            }}
          >
            {appointment.info}
          </Typography>
        </Box>
      ) : null}

      {employee ? (
        <TourInfoBox
          employeeName={`${employee.first_name.charAt(0)}. ${employee.last_name}`}
          area={area}
          utilization={utilization}
          tourColor={tourColor}
          durationMinutes={durationMinutes}
          targetMinutes={targetMinutes}
        />
      ) : null}
    </>
  );
};
