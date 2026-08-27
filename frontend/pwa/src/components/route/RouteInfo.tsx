import React, { useMemo, useState } from "react";
import { Box, Typography, Button, IconButton } from "@mui/material";
import {
  DirectionsCar as DirectionsCarIcon,
  Sort as SortIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { useUserStore } from "../../stores/useUserStore";
import { useWeekdayStore } from "../../stores/useWeekdayStore";
import {
  useApplyOptimizedOrder,
  useRoutes,
} from "../../services/queries/useRoutes";
import { Weekday } from "../../types/models";
import { useNrwpHolidayForTourDay } from "../../hooks/useNrwpHolidayForTourDay";
import CustomOrderSheet, { type CustomOrderStop } from "./CustomOrderSheet";
import { findEmployeeDayRoute } from "../../utils/mapUtils";
import { getOwnRouteDistance, getOwnRouteOrder } from "@palliroute/shared";
import { usePatients } from "../../services/queries/usePatients";
import { useAppointmentsByWeekday } from "../../services/queries/useAppointments";

export const RouteInfo: React.FC = () => {
  const { selectedUserId } = useUserStore();
  const { selectedWeekday } = useWeekdayStore();
  const { isAreaTourDay } = useNrwpHolidayForTourDay(
    selectedWeekday as Weekday,
  );
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: routes = [], refetch: refetchRoutes } = useRoutes({
    weekday: selectedWeekday as Weekday,
  });
  const { data: patients = [], refetch: refetchPatients } = usePatients();
  const { data: appointments = [], refetch: refetchAppointments } =
    useAppointmentsByWeekday(selectedWeekday as Weekday);
  const applyOptimizedOrder = useApplyOptimizedOrder();

  const selectedRoute = useMemo(
    () =>
      findEmployeeDayRoute(
        routes,
        selectedUserId,
        selectedWeekday,
        isAreaTourDay,
      ),
    [routes, selectedUserId, selectedWeekday, isAreaTourDay],
  );

  const customOrderStops = useMemo(() => {
    if (!selectedRoute) return [];
    return getOwnRouteOrder(selectedRoute)
      .map((appointmentId) => {
        const appointment = appointments.find((a) => a.id === appointmentId);
        if (!appointment) return null;
        const patient = patients.find((p) => p.id === appointment.patient_id);
        if (!patient) return null;
        const stop: CustomOrderStop = {
          id: appointmentId,
          patientName: `${patient.first_name} ${patient.last_name}`,
          visitType: appointment.visit_type,
          address: `${patient.street}, ${patient.zip_code} ${patient.city}`,
        };
        if (appointment.info) {
          stop.info = appointment.info;
        }
        return stop;
      })
      .filter((stop): stop is CustomOrderStop => stop != null);
  }, [selectedRoute, appointments, patients]);

  /** Progress only for HB/NA stops on the own route (TK excluded, order-independent). */
  const visitProgress = useMemo(() => {
    if (!selectedRoute) return { done: 0, total: 0 };
    const routeAppointmentIds = getOwnRouteOrder(selectedRoute);
    let done = 0;
    let total = 0;
    for (const appointmentId of routeAppointmentIds) {
      const appointment = appointments.find((a) => a.id === appointmentId);
      if (!appointment) continue;
      if (appointment.visit_type !== "HB" && appointment.visit_type !== "NA")
        continue;
      total += 1;
      if (appointment.completed) done += 1;
    }
    return { done, total };
  }, [selectedRoute, appointments]);

  const pullFromDatabase = async () => {
    await Promise.all([
      refetchRoutes(),
      refetchAppointments(),
      refetchPatients(),
    ]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const customActive = Boolean(selectedRoute?.custom_order_active);
      if (selectedRoute && !customActive) {
        await applyOptimizedOrder.mutateAsync(selectedRoute.id);
      }
      await pullFromDatabase();
    } catch (error) {
      console.error("Failed to refresh route:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleResetCustomOrder = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedRoute) return;
    try {
      await applyOptimizedOrder.mutateAsync(selectedRoute.id);
    } catch (error) {
      console.error("Failed to reset custom order:", error);
    }
  };

  const formatDistance = (distance: number): string => {
    return (
      distance.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) + " km"
    );
  };

  const customActive = Boolean(selectedRoute?.custom_order_active);
  const isBusy = isRefreshing || applyOptimizedOrder.isPending;
  const accent = isAreaTourDay ? "#ff9800" : "#007AFF";
  const accentBg = isAreaTourDay
    ? "rgba(255, 152, 0, 0.12)"
    : "rgba(0, 122, 255, 0.1)";
  const accentBorder = isAreaTourDay
    ? "rgba(255, 152, 0, 0.35)"
    : "rgba(0, 122, 255, 0.2)";
  const progressRatio =
    visitProgress.total > 0
      ? Math.min(1, visitProgress.done / visitProgress.total)
      : 0;
  const progressComplete =
    visitProgress.total > 0 && visitProgress.done === visitProgress.total;
  const metricColor = progressComplete ? "#34C759" : accent;

  const metricRowSx = {
    display: "flex",
    alignItems: "center",
    gap: 0.75,
    minHeight: 18,
  } as const;

  const metricIconSx = {
    width: 18,
    height: 18,
    borderRadius: "50%",
    flexShrink: 0,
    bgcolor: metricColor,
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;

  const metricTextSx = {
    fontWeight: 700,
    fontSize: "0.8125rem",
    lineHeight: 1.2,
    letterSpacing: 0,
  } as const;

  const renderMetricRow = (
    icon: React.ReactNode,
    label: string,
    value: string,
  ) => (
    <Box sx={metricRowSx}>
      <Box sx={metricIconSx}>{icon}</Box>
      <Typography component="span" sx={{ ...metricTextSx, color: metricColor }}>
        {label}
      </Typography>
      <Typography
        component="span"
        sx={{ ...metricTextSx, ml: "auto", color: "#1d1d1f" }}
      >
        {value}
      </Typography>
    </Box>
  );

  const buttonSx = {
    borderRadius: 1.5,
    textTransform: "none" as const,
    fontSize: "0.75rem",
    fontWeight: 600,
    py: 1,
    px: 1.25,
    minHeight: "unset",
    display: "flex",
    alignItems: "center",
    gap: 0.75,
    justifyContent: "center",
  };

  return (
    <Box sx={{ px: 3, pb: 2 }}>
      {selectedRoute ? (
        <Box
          sx={{
            mb: 1,
            px: 1.5,
            py: 0.85,
            bgcolor: progressComplete ? "rgba(52, 199, 89, 0.12)" : accentBg,
            borderRadius: 1.5,
            border: `1px solid ${progressComplete ? "rgba(52, 199, 89, 0.35)" : accentBorder}`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {visitProgress.total > 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                pb: 0.75,
              }}
            >
              {renderMetricRow(
                <CheckIcon sx={{ fontSize: 12 }} />,
                "Fortschritt",
                `${visitProgress.done}/${visitProgress.total}`,
              )}
              <Box
                sx={{
                  height: 6,
                  borderRadius: 999,
                  bgcolor: "rgba(0, 0, 0, 0.06)",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width: `${progressRatio * 100}%`,
                    borderRadius: 999,
                    bgcolor: metricColor,
                    transition: "width 0.25s ease, background-color 0.2s ease",
                  }}
                />
              </Box>
            </Box>
          ) : null}

          <Box
            sx={{
              ...(visitProgress.total > 0
                ? {
                    pt: 0.75,
                    borderTop: `1px solid ${
                      progressComplete
                        ? "rgba(52, 199, 89, 0.2)"
                        : "rgba(0, 122, 255, 0.15)"
                    }`,
                  }
                : {}),
            }}
          >
            {renderMetricRow(
              <DirectionsCarIcon sx={{ fontSize: 12 }} />,
              "Distanz",
              formatDistance(getOwnRouteDistance(selectedRoute)),
            )}
          </Box>
        </Box>
      ) : (
        <Box sx={{ pb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Keine Route verfügbar
          </Typography>
        </Box>
      )}

      <Box sx={{ display: "flex", gap: 1 }}>
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "stretch",
            bgcolor:
              customOrderStops.length === 0
                ? "rgba(0, 122, 255, 0.4)"
                : "#007AFF",
            borderRadius: 1.5,
            overflow: "hidden",
            minHeight: 44,
          }}
        >
          <Button
            variant="contained"
            onClick={() => setCustomOrderOpen(true)}
            disabled={customOrderStops.length === 0}
            sx={{
              ...buttonSx,
              flex: 1,
              bgcolor: "transparent",
              boxShadow: "none",
              "&:hover": { bgcolor: "transparent", boxShadow: "none" },
              "&.Mui-disabled": { bgcolor: "transparent", color: "white" },
            }}
          >
            {customActive ? (
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  bgcolor: "#34C759",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CheckIcon sx={{ fontSize: 14, color: "white" }} />
              </Box>
            ) : (
              <SortIcon sx={{ fontSize: 18 }} />
            )}
            Eigene Reihenfolge
          </Button>
          {customActive ? (
            <IconButton
              aria-label="Eigene Reihenfolge zurücksetzen"
              disabled={isBusy}
              onClick={handleResetCustomOrder}
              sx={{
                width: 44,
                color: "white",
                borderRadius: 0,
                "&:hover": { bgcolor: "transparent" },
              }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          ) : null}
        </Box>
        <IconButton
          aria-label="Daten aktualisieren"
          disabled={isBusy}
          onClick={handleRefresh}
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.5,
            bgcolor: "rgba(0, 122, 255, 0.12)",
            color: "#007AFF",
            "&:hover": {
              bgcolor: "rgba(0, 122, 255, 0.12)",
            },
          }}
        >
          <RefreshIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {selectedRoute ? (
        <CustomOrderSheet
          open={customOrderOpen}
          onClose={() => setCustomOrderOpen(false)}
          stops={customOrderStops}
          routeId={selectedRoute.id}
        />
      ) : null}
    </Box>
  );
};
