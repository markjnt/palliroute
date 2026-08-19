import React from 'react';
import { Box, Typography } from '@mui/material';
import { MarkerData } from '../../../types/mapTypes';
import { Business as BusinessIcon } from '@mui/icons-material';

interface PflegeheimInfoContentProps {
  marker: MarkerData;
}

/**
 * Component for displaying Pflegeheim marker information in info windows
 */
export const PflegeheimInfoContent: React.FC<PflegeheimInfoContentProps> = ({ marker }) => {
  const name = marker.title;
  const address = marker.customAddress;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, pr: 4.5 }}>
        <BusinessIcon sx={{ color: '#388e3c', fontSize: 20 }} />
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            color: '#1d1d1f',
            fontSize: '1rem',
            lineHeight: 1.25,
          }}
        >
          {name}
        </Typography>
      </Box>
      {address && (
        <Typography variant="body2" sx={{ color: '#8E8E93', fontWeight: 500 }}>
          {address}
        </Typography>
      )}
    </>
  );
};
