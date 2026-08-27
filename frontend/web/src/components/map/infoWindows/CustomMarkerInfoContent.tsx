import React from "react";
import { Box, Typography } from "@mui/material";
import { MarkerData } from "../../../types/mapTypes";
import { Place as PlaceIcon } from "@mui/icons-material";

interface CustomMarkerInfoContentProps {
  marker: MarkerData;
}

/**
 * Component for displaying custom user-added marker information in info windows
 */
export const CustomMarkerInfoContent: React.FC<
  CustomMarkerInfoContentProps
> = ({ marker }) => {
  const name = marker.title;
  const address = marker.customAddress;

  return (
    <>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, pr: 4.5 }}
      >
        <PlaceIcon sx={{ color: "#ff5722", fontSize: 20 }} />
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            color: "#1d1d1f",
            fontSize: "1rem",
            lineHeight: 1.25,
          }}
        >
          {name}
        </Typography>
      </Box>
      {address && (
        <Typography variant="body2" sx={{ color: "#8E8E93", fontWeight: 500 }}>
          {address}
        </Typography>
      )}
    </>
  );
};
