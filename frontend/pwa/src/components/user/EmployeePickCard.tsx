import React from 'react';
import { Box, Card, CardContent, Typography, Avatar, Chip, IconButton } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
} from '@mui/icons-material';
import { Employee } from '../../types/models';
import { employeeTypeColors, getTourAreaColor } from '@palliroute/shared';

interface EmployeePickCardProps {
  employee: Employee;
  selected: boolean;
  accentColor?: string;
  onClick: () => void;
}

const getInitials = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

export const EmployeePickCard: React.FC<EmployeePickCardProps> = ({
  employee,
  selected,
  accentColor,
  onClick,
}) => {
  const color = accentColor || '#007AFF';
  const functionColor = employeeTypeColors[employee.function] || employeeTypeColors.default;

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderRadius: 2,
        border: selected ? `2px solid ${color}` : '1px solid rgba(0, 0, 0, 0.08)',
        background: selected
          ? 'linear-gradient(135deg, #f0f8ff 0%, #ffffff 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
          borderColor: selected ? color : 'rgba(0, 122, 255, 0.3)',
        },
      }}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Box display="flex" alignItems="center">
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: selected ? color : '#f0f0f0',
              color: selected ? 'white' : '#666',
              mr: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            {getInitials(employee.first_name, employee.last_name)}
          </Avatar>
          <Box flex={1}>
            <Typography
              variant="subtitle1"
              component="h3"
              sx={{
                fontWeight: 600,
                color: '#1d1d1f',
                fontSize: '0.95rem',
                lineHeight: 1.3,
                mb: 0.25,
              }}
            >
              {`${employee.first_name} ${employee.last_name}`}
            </Typography>
            <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
              {employee.function && (
                <Chip
                  label={employee.function}
                  size="small"
                  sx={{
                    bgcolor: functionColor,
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    height: 18,
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              )}
              {employee.city && (
                <Chip
                  label={employee.city}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: '0.7rem',
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    height: 18,
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              )}
            </Box>
          </Box>
          <IconButton
            size="small"
            sx={{
              color: selected ? color : 'rgba(0, 0, 0, 0.3)',
              ml: 0.5,
              '& .MuiSvgIcon-root': { fontSize: '1.2rem' },
            }}
          >
            {selected ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

interface AreaPickCardProps {
  area: string;
  assignedName?: string | null;
  selected: boolean;
  onClick: () => void;
}

export const AreaPickCard: React.FC<AreaPickCardProps> = ({
  area,
  assignedName,
  selected,
  onClick,
}) => {
  const color = getTourAreaColor(area);

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderRadius: 2,
        border: selected ? `2px solid ${color}` : '1px solid rgba(0, 0, 0, 0.08)',
        background: selected
          ? 'linear-gradient(135deg, #f0f8ff 0%, #ffffff 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
        boxShadow: 'none',
      }}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Box display="flex" alignItems="center">
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: selected ? color : '#f0f0f0',
              color: selected ? 'white' : '#666',
              mr: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            {area.charAt(0)}
          </Avatar>
          <Box flex={1}>
            <Typography
              variant="subtitle1"
              component="h3"
              sx={{
                fontWeight: 600,
                color: '#1d1d1f',
                fontSize: '0.95rem',
                lineHeight: 1.3,
                mb: 0.25,
              }}
            >
              {area}
            </Typography>
            <Chip
              label={assignedName || 'Nicht zugewiesen'}
              size="small"
              sx={{
                bgcolor: assignedName ? color : 'transparent',
                color: assignedName ? 'white' : 'text.secondary',
                border: assignedName ? 'none' : '1px solid rgba(0, 0, 0, 0.12)',
                fontSize: '0.7rem',
                fontWeight: 500,
                height: 18,
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          </Box>
          <IconButton
            size="small"
            sx={{
              color: selected ? color : 'rgba(0, 0, 0, 0.3)',
              ml: 0.5,
              '& .MuiSvgIcon-root': { fontSize: '1.2rem' },
            }}
          >
            {selected ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

export const EmployeeFilterChips: React.FC<{
  activeFilter: string;
  onChange: (filter: string) => void;
  filters?: Array<{ id: string; label: string; color?: string }>;
  trailing?: React.ReactNode;
}> = ({ activeFilter, onChange, filters, trailing }) => {
  const items = filters || [
    { id: 'all', label: 'Alle' },
    { id: 'pflege-nord', label: 'Pflege Nord', color: employeeTypeColors.default },
    { id: 'pflege-sued', label: 'Pflege Süd', color: employeeTypeColors.default },
    { id: 'arzt', label: 'Arzt', color: employeeTypeColors.Arzt },
    { id: 'honorararzt', label: 'Honorararzt', color: employeeTypeColors.Honorararzt },
  ];

  return (
    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, flex: 1, minWidth: 0 }}>
        {items.map((item) => {
          const selected = activeFilter === item.id;
          return (
            <Chip
              key={item.id}
              label={item.label}
              onClick={() => onChange(item.id)}
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              sx={{
                fontWeight: selected ? 600 : 400,
                bgcolor: selected && item.color ? item.color : undefined,
                color: selected && item.color ? 'white' : undefined,
                '&:hover': {
                  bgcolor: selected && item.color ? item.color : undefined,
                },
              }}
            />
          );
        })}
      </Box>
      {trailing}
    </Box>
  );
};
