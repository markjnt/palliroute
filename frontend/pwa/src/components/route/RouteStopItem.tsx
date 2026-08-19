import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import {
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Phone as PhoneIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { getColorForVisitType } from '../../utils/mapUtils';
import { useUserStore } from '../../stores/useUserStore';
import { useAdditionalRoutesStore } from '../../stores/useAdditionalRoutesStore';
import { StopActionButtons, openMaps, callPhone } from './StopActionButtons';

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
}

export const RouteStopItem: React.FC<RouteStopItemProps> = ({ stop, onShowAdditionalRoute }) => {
  const { selectedUserId } = useUserStore();
  const { addEmployee } = useAdditionalRoutesStore();

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
        opacity: stop.isTourEmployeeAppointment ? 0.5 : 1,
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
              alignSelf: 'flex-start',
              boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)',
            }}
          >
            {stop.position}
          </Box>
        )}

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: '#1d1d1f',
                flex: 1,
                fontSize: { xs: '0.875rem', sm: '1rem' },
                lineHeight: 1.3,
              }}
            >
              {stop.patientName}
            </Typography>
          </Box>


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

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LocationIcon
              sx={{
                fontSize: { xs: 13, sm: 14 },
                color: '#8E8E93',
                mr: 0.5,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: '#8E8E93',
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                cursor: 'pointer',
                transition: 'color 0.2s ease',
              }}
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

          {stop.info && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <InfoIcon sx={{ fontSize: 14, color: '#007AFF', mr: 0.5 }} />
              <Typography
                variant="caption"
                sx={{
                  color: '#007AFF',
                  fontSize: '0.75rem',
                  bgcolor: 'rgba(0, 122, 255, 0.1)',
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                }}
              >
                {stop.info}
              </Typography>
            </Box>
          )}

          {(stop.phone1 || stop.phone2) && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
              {stop.phone1 && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PhoneIcon sx={{ fontSize: 14, color: '#8E8E93', mr: 0.5 }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#8E8E93',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => callPhone(stop.phone1!)}
                  >
                    {stop.phone1}
                  </Typography>
                </Box>
              )}
              {stop.phone2 && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PhoneIcon sx={{ fontSize: 14, color: '#8E8E93', mr: 0.5 }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#8E8E93',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => callPhone(stop.phone2!)}
                  >
                    {stop.phone2}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
          </Box>
          <Box sx={{ ml: 1, flexShrink: 0 }}>
            <StopActionButtons address={stop.address} phone1={stop.phone1} phone2={stop.phone2} />
          </Box>
        </Box>

        <Chip
          label={stop.visitType === 'HB' ? 'HB' : stop.visitType}
          size="small"
          sx={{
            alignSelf: 'flex-start',
            flexShrink: 0,
            ml: 0.75,
            bgcolor: `${getColorForVisitType(stop.visitType)}15`,
            color: getColorForVisitType(stop.visitType),
            fontSize: { xs: '0.7rem', sm: '0.75rem' },
            height: { xs: 18, sm: 20 },
            fontWeight: 600,
            border: `1px solid ${getColorForVisitType(stop.visitType)}30`,
          }}
        />
      </Box>
    </Box>
  );
};

export default RouteStopItem;
