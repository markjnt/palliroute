import React from 'react';
import { Box, Paper, Typography, Switch } from '@mui/material';

interface AutoPlanningSectionProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const AutoPlanningSection: React.FC<AutoPlanningSectionProps> = ({
  icon,
  title,
  subtitle,
  actions,
  children,
}) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      borderRadius: 3,
      backgroundColor: 'white',
      border: '1px solid',
      borderColor: 'rgba(0, 0, 0, 0.06)',
    }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 1.5,
        mb: children ? 2.25 : 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, minWidth: 0 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 122, 255, 0.08)',
            color: 'primary.main',
            flexShrink: 0,
            '& svg': { fontSize: 18 },
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, pt: 0.25 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.25 }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.35, fontSize: '0.78rem', lineHeight: 1.35 }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      {actions}
    </Box>
    {children}
  </Paper>
);

interface OptionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

export const AutoPlanningOptionCard: React.FC<OptionCardProps> = ({
  icon,
  title,
  description,
  selected,
  onClick,
}) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1.25,
      p: 1.75,
      width: '100%',
      textAlign: 'left',
      cursor: 'pointer',
      borderRadius: 2.5,
      border: '1.5px solid',
      borderColor: selected ? 'primary.main' : 'rgba(0, 0, 0, 0.08)',
      backgroundColor: selected ? 'rgba(0, 122, 255, 0.06)' : 'rgba(0, 0, 0, 0.015)',
      transition: 'all 0.15s ease',
      fontFamily: 'inherit',
      '&:hover': {
        borderColor: selected ? 'primary.main' : 'rgba(0, 0, 0, 0.16)',
        backgroundColor: selected ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)',
      },
      '&:focus-visible': {
        outline: '2px solid',
        outlineColor: 'primary.main',
        outlineOffset: 2,
      },
    }}
  >
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        backgroundColor: selected ? 'primary.main' : 'rgba(0, 0, 0, 0.05)',
        color: selected ? 'white' : 'text.secondary',
        '& svg': { fontSize: 17 },
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0, pt: 0.15 }}>
      <Typography
        variant="body2"
        sx={{ fontWeight: selected ? 600 : 500, fontSize: '0.875rem', lineHeight: 1.25 }}
      >
        {title}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 0.35, fontSize: '0.75rem', lineHeight: 1.35 }}
      >
        {description}
      </Typography>
    </Box>
  </Box>
);

interface SwitchRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const AutoPlanningSwitchRow: React.FC<SwitchRowProps> = ({
  icon,
  title,
  description,
  checked,
  onChange,
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 2,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, minWidth: 0 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          backgroundColor: checked ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          color: checked ? 'primary.main' : 'text.secondary',
          transition: 'all 0.15s ease',
          '& svg': { fontSize: 17 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, pt: 0.15 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.25 }}
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.35, fontSize: '0.75rem', lineHeight: 1.35 }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
    <Switch
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      sx={{
        flexShrink: 0,
        '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.main' },
        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
          backgroundColor: 'primary.main',
        },
      }}
    />
  </Box>
);
