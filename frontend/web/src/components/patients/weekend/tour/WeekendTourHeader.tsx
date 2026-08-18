import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

type TourArea = 'Nord' | 'Mitte' | 'Süd';

interface WeekendTourHeaderProps {
  area: TourArea;
  children?: React.ReactNode;
}

export const WeekendTourHeader: React.FC<WeekendTourHeaderProps> = ({ area, children }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1.5,
        width: '100%',
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexShrink: 0,
          pb: 0.5,
          width: 152,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {(area === 'Nord' || area === 'Mitte') && (
            <Chip
              label="N"
              size="small"
              sx={{
                height: '20px',
                fontSize: '0.7rem',
                bgcolor: 'primary.main',
                color: 'white',
                fontWeight: 'bold',
              }}
            />
          )}
          {(area === 'Süd' || area === 'Mitte') && (
            <Chip
              label="S"
              size="small"
              sx={{
                height: '20px',
                fontSize: '0.7rem',
                bgcolor: 'secondary.main',
                color: 'white',
                fontWeight: 'bold',
              }}
            />
          )}
        </Box>

        <Typography
          variant="h6"
          component="h3"
          sx={{
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            color: (() => {
              switch (area) {
                case 'Nord':
                  return '#1976d2';
                case 'Mitte':
                  return '#7b1fa2';
                case 'Süd':
                  return '#388e3c';
                default:
                  return '#ff9800';
              }
            })(),
          }}
        >
          AW {area}
        </Typography>
      </Box>
      {children ? (
        <Box sx={{ display: 'flex', flex: 1, minWidth: 0 }}>{children}</Box>
      ) : null}
    </Box>
  );
};
