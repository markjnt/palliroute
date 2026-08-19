import React from 'react';
import { Box, IconButton } from '@mui/material';
import {
  Map as MapIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';

const openMaps = (address: string) => {
  window.location.href = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
};

const callPhone = (phone: string) => {
  window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
};

interface StopActionButtonsProps {
  address?: string;
  phone1?: string;
  phone2?: string;
  showMaps?: boolean;
}

const circleButtonSx = (enabled: boolean, color: string) => ({
  width: { xs: 38, sm: 40 },
  height: { xs: 38, sm: 40 },
  p: 0,
  borderRadius: '50%',
  bgcolor: enabled ? color : 'rgba(0, 0, 0, 0.06)',
  color: enabled ? 'white' : '#C7C7CC',
  flexShrink: 0,
  boxShadow: enabled ? `0 2px 8px ${color}40` : 'none',
  '&:hover': {
    bgcolor: enabled ? color : 'rgba(0, 0, 0, 0.06)',
    opacity: enabled ? 0.9 : 1,
  },
  '&.Mui-disabled': {
    bgcolor: 'rgba(0, 0, 0, 0.06)',
    color: '#C7C7CC',
  },
});

export const StopActionButtons: React.FC<StopActionButtonsProps> = ({
  address,
  phone1,
  phone2,
  showMaps = true,
}) => {
  const phone = phone1 || phone2;
  const hasAddress = Boolean(address?.trim());
  const hasPhone = Boolean(phone?.trim());

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.75, flexShrink: 0 }}>
      {showMaps && (
        <IconButton
          aria-label="In Google Maps öffnen"
          disabled={!hasAddress}
          onClick={(e) => {
            e.stopPropagation();
            if (address) openMaps(address);
          }}
          sx={circleButtonSx(hasAddress, '#007AFF')}
        >
          <MapIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
        </IconButton>
      )}
      <IconButton
        aria-label="Anrufen"
        disabled={!hasPhone}
        onClick={(e) => {
          e.stopPropagation();
          if (phone) callPhone(phone);
        }}
        sx={circleButtonSx(hasPhone, '#34C759')}
      >
        <PhoneIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
      </IconButton>
    </Box>
  );
};

export { openMaps, callPhone };
