import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { AccessTime as TimeIcon } from '@mui/icons-material';
import { getColorForVisitType } from '../../utils/mapUtils';
import { useUserStore } from '../../stores/useUserStore';
import { useAdditionalRoutesStore } from '../../stores/useAdditionalRoutesStore';
import { StopMapsButton, StopCallButton, StopInfoIcon } from './StopActionButtons';
import { AppointmentCheckControl } from './AppointmentCheckControl';
import { openMaps, callPhone } from './stopContactActions';

interface RouteStop {
  id: number;
  position: number;
  patientName: string;
  address: string;
  visitType: string;
  time?: string;
  phone1?: string;
  phone2?: string;
  info?: string;
  completed?: boolean;
  responsibleEmployeeName?: string;
  responsibleEmployeeId?: number;
  tourEmployeeName?: string;
  tourEmployeeId?: number;
  isTourEmployeeAppointment?: boolean;
  originEmployeeName?: string;
  otherResponsibleEmployees?: Array<{
    employee: { id?: number; first_name: string; last_name: string };
    appointmentId: number;
  }>;
}

interface RouteStopItemProps {
  stop: RouteStop;
  onShowAdditionalRoute?: () => void;
  onToggleCompleted?: (appointmentId: number, completed: boolean) => void;
}

const clickableTextSx = {
  color: '#8E8E93',
  fontSize: { xs: '0.7rem', sm: '0.75rem' },
  cursor: 'pointer',
  lineHeight: 1.35,
  '&:active': {
    color: '#1d1d1f',
  },
} as const;

export const RouteStopItem: React.FC<RouteStopItemProps> = ({
  stop,
  onShowAdditionalRoute,
  onToggleCompleted,
}) => {
  const { selectedUserId } = useUserStore();
  const { addEmployee } = useAdditionalRoutesStore();
  const completed = Boolean(stop.completed);

  const showAsAdditionalRoute = (employeeId?: number) => {
    if (!employeeId || Number(employeeId) === Number(selectedUserId)) return;
    addEmployee(employeeId);
    onShowAdditionalRoute?.();
  };

  const employeeLinkSx = {
    color: '#007AFF',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: 1,
    px: 0.5,
    py: 0.25,
    transition: 'background-color 0.2s ease',
    '&:hover': {
      bgcolor: 'rgba(0, 122, 255, 0.1)',
    },
    '&:active': {
      bgcolor: 'rgba(0, 122, 255, 0.2)',
    },
  };

  return (
    <Box
      sx={{
        opacity: stop.isTourEmployeeAppointment ? 0.5 : completed ? 0.72 : 1,
        filter: stop.isTourEmployeeAppointment ? 'grayscale(0.3)' : 'none',
        borderRadius: 1,
        mx: 0.5,
        my: 0.25,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          p: { xs: 1.25, sm: 1.5 },
        }}
      >
        {!stop.isTourEmployeeAppointment && (
          <Box
            sx={{
              width: { xs: 32, sm: 36 },
              height: { xs: 32, sm: 36 },
              borderRadius: '50%',
              bgcolor: '#007AFF',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              fontWeight: 700,
              mr: { xs: 1.5, sm: 2 },
              flexShrink: 0,
              alignSelf: 'center',
              boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)',
            }}
          >
            {stop.position}
          </Box>
        )}

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: completed ? '#8E8E93' : '#1d1d1f',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              lineHeight: 1.3,
              textDecoration: completed ? 'line-through' : 'none',
              mb: 0.75,
            }}
          >
            {stop.patientName}
          </Typography>

          {stop.responsibleEmployeeName && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Typography
                variant="caption"
                onClick={() => showAsAdditionalRoute(stop.responsibleEmployeeId)}
                sx={employeeLinkSx}
              >
                Zuständig: {stop.responsibleEmployeeName}
              </Typography>
            </Box>
          )}

          {stop.tourEmployeeName && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Typography
                variant="caption"
                onClick={() => showAsAdditionalRoute(stop.tourEmployeeId)}
                sx={employeeLinkSx}
              >
                Ursprungstour: {stop.tourEmployeeName}
              </Typography>
            </Box>
          )}

          {stop.originEmployeeName && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  color: '#007AFF',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                Ursprünglich (Vertretung): {stop.originEmployeeName}
              </Typography>
            </Box>
          )}

          {stop.otherResponsibleEmployees && stop.otherResponsibleEmployees.length > 0 && (
            <>
              {stop.otherResponsibleEmployees.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Typography
                    variant="caption"
                    onClick={() => showAsAdditionalRoute(item.employee.id)}
                    sx={employeeLinkSx}
                  >
                    Gemeinsam mit: {item.employee.first_name} {item.employee.last_name}
                  </Typography>
                </Box>
              ))}
            </>
          )}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              minWidth: 0,
            }}
          >
            <StopMapsButton address={stop.address} />
            <Typography
              variant="caption"
              sx={clickableTextSx}
              onClick={() => openMaps(stop.address)}
            >
              {stop.address}
            </Typography>
          </Box>

          {stop.time && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <TimeIcon sx={{ fontSize: 14, color: '#8E8E93', mr: 0.5 }} />
              <Typography
                variant="caption"
                sx={{
                  color: '#8E8E93',
                  fontSize: '0.75rem',
                }}
              >
                {stop.time}
              </Typography>
            </Box>
          )}

          {(stop.phone1 || stop.phone2) && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                mt: 0.5,
              }}
            >
              {stop.phone1 && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    minWidth: 0,
                  }}
                >
                  <StopCallButton phone={stop.phone1} />
                  <Typography
                    variant="caption"
                    sx={clickableTextSx}
                    onClick={() => callPhone(stop.phone1!)}
                  >
                    {stop.phone1}
                  </Typography>
                </Box>
              )}
              {stop.phone2 && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    minWidth: 0,
                  }}
                >
                  <StopCallButton phone={stop.phone2} />
                  <Typography
                    variant="caption"
                    sx={clickableTextSx}
                    onClick={() => callPhone(stop.phone2!)}
                  >
                    {stop.phone2}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {stop.info && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                minWidth: 0,
                mt: 0.5,
              }}
            >
              <StopInfoIcon />
              <Typography
                variant="caption"
                sx={{
                  color: '#007AFF',
                  fontSize: '0.75rem',
                  bgcolor: 'rgba(0, 122, 255, 0.1)',
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  lineHeight: 1.35,
                }}
              >
                {stop.info}
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            ml: 0.75,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
            minWidth: 44,
            alignSelf: 'flex-start',
          }}
        >
          <Chip
            label={stop.visitType === 'HB' ? 'HB' : stop.visitType}
            size="small"
            sx={{
              bgcolor: `${getColorForVisitType(stop.visitType)}15`,
              color: getColorForVisitType(stop.visitType),
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              height: { xs: 18, sm: 20 },
              fontWeight: 600,
              border: `1px solid ${getColorForVisitType(stop.visitType)}30`,
            }}
          />
          <AppointmentCheckControl
            completed={completed}
            onToggle={() => onToggleCompleted?.(stop.id, !completed)}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default RouteStopItem;
