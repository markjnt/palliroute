import React from "react";
import { Box, IconButton } from "@mui/material";
import {
  Map as MapIcon,
  Phone as PhoneIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { callPhone, openMaps } from "./stopContactActions";

const inlineCircleSx = (enabled: boolean, color: string) => ({
  width: 28,
  height: 28,
  p: 0,
  borderRadius: "50%",
  flexShrink: 0,
  bgcolor: enabled ? color : "rgba(0, 0, 0, 0.06)",
  color: enabled ? "white" : "#C7C7CC",
  boxShadow: enabled ? `0 2px 6px ${color}40` : "none",
  "&:hover": {
    bgcolor: enabled ? color : "rgba(0, 0, 0, 0.06)",
    opacity: enabled ? 0.9 : 1,
  },
  "&.Mui-disabled": {
    bgcolor: "rgba(0, 0, 0, 0.06)",
    color: "#C7C7CC",
  },
});

/** Decorative info circle matching maps/call inline buttons (28px). */
export const StopInfoIcon: React.FC = () => (
  <Box
    sx={{
      width: 28,
      height: 28,
      borderRadius: "50%",
      flexShrink: 0,
      bgcolor: "#007AFF",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 6px rgba(0, 122, 255, 0.25)",
    }}
  >
    <InfoIcon sx={{ fontSize: 15 }} />
  </Box>
);

interface StopMapsButtonProps {
  address?: string;
}

export const StopMapsButton: React.FC<StopMapsButtonProps> = ({ address }) => {
  const hasAddress = Boolean(address?.trim());
  return (
    <IconButton
      aria-label="In Google Maps öffnen"
      disabled={!hasAddress}
      onClick={(e) => {
        e.stopPropagation();
        if (address) openMaps(address);
      }}
      sx={inlineCircleSx(hasAddress, "#007AFF")}
    >
      <MapIcon sx={{ fontSize: 15 }} />
    </IconButton>
  );
};

interface StopCallButtonProps {
  phone?: string;
}

export const StopCallButton: React.FC<StopCallButtonProps> = ({ phone }) => {
  const hasPhone = Boolean(phone?.trim());
  return (
    <IconButton
      aria-label="Anrufen"
      disabled={!hasPhone}
      onClick={(e) => {
        e.stopPropagation();
        if (phone) callPhone(phone);
      }}
      sx={inlineCircleSx(hasPhone, "#34C759")}
    >
      <PhoneIcon sx={{ fontSize: 15 }} />
    </IconButton>
  );
};
