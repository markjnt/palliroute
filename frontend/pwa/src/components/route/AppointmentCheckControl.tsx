import React from "react";
import { Box } from "@mui/material";
import { Check as CheckIcon } from "@mui/icons-material";

interface AppointmentCheckControlProps {
  completed: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * Compact checklist control for route rows.
 * Visual circle ~28px; hit area ~44px (mobile touch target).
 */
export const AppointmentCheckControl: React.FC<
  AppointmentCheckControlProps
> = ({ completed, onToggle, disabled = false }) => {
  return (
    <Box
      component="button"
      type="button"
      aria-label={completed ? "Termin als offen markieren" : "Termin abhaken"}
      aria-pressed={completed}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      sx={{
        // 44×44 touch target, visual circle stays compact under the type chip
        width: 44,
        height: 44,
        p: 0,
        m: 0,
        border: "none",
        bgcolor: "transparent",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.55 : 1,
        WebkitTapHighlightColor: "transparent",
        "&:active:not(:disabled) .check-visual": {
          transform: "scale(0.9)",
        },
      }}
    >
      <Box
        className="check-visual"
        sx={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition:
            "background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease",
          ...(completed
            ? {
                bgcolor: "#34C759",
                border: "2px solid #34C759",
                color: "white",
                boxShadow: "0 2px 6px rgba(52, 199, 89, 0.35)",
              }
            : {
                bgcolor: "#ffffff",
                border: "2px solid rgba(0, 0, 0, 0.18)",
                color: "transparent",
                boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.04)",
              }),
        }}
      >
        <CheckIcon
          sx={{
            fontSize: 18,
            opacity: completed ? 1 : 0,
            transition: "opacity 0.15s ease",
          }}
        />
      </Box>
    </Box>
  );
};

export default AppointmentCheckControl;
