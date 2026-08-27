import React, { useState } from 'react';
import { InfoWindow } from '@react-google-maps/api';
import { MarkerData } from '../../types/mapTypes';
import { Patient, Appointment, Employee, Weekday } from '../../types/models';
import { getColorForVisitType, findEmployeeDayRoute } from '../../utils/mapUtils';
import { getColorForAdditionalTour, getTourAreaColor } from '@palliroute/shared';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Schedule as TimeIcon,
  Info as InfoIcon,
  Map as MapIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useMoveAppointment } from '../../services/queries/useAppointments';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { useEmployees } from '../../services/queries/useEmployees';
import { useRoutes } from '../../services/queries/useRoutes';
import { useNrwpHolidayForTourDay } from '../../hooks/useNrwpHolidayForTourDay';
import { useCloseOnMapClick } from '@palliroute/ui';
import { openMaps, callPhone } from '../route/stopContactActions';

const dialogPaperSx = {
  borderRadius: 3,
  bgcolor: 'rgba(255, 255, 255, 0.96)',
  backdropFilter: 'blur(20px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.35)',
  mx: 2,
  overflow: 'hidden',
};

const inlineActionSx = (color: string) => ({
  width: 28,
  height: 28,
  p: 0,
  mr: 1.25,
  mt: 0.1,
  borderRadius: '50%',
  bgcolor: color,
  color: 'white',
  flexShrink: 0,
  boxShadow: `0 2px 6px ${color}40`,
  '&:hover': { bgcolor: color, opacity: 0.9 },
});

interface StopPopupProps {
  marker: MarkerData;
  patient: Patient | undefined;
  appointment: Appointment | undefined;
  onClose: () => void;
  isAdditionalRoute?: boolean;
  employee?: Employee;
}

export const StopPopup: React.FC<StopPopupProps> = ({
  marker,
  patient,
  appointment,
  onClose,
  isAdditionalRoute = false,
  employee,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const { selectedUserId } = useUserStore();
  const { selectedWeekday } = useWeekdayStore();
  const { isAreaTourDay } = useNrwpHolidayForTourDay(selectedWeekday as Weekday);
  const { data: employees = [] } = useEmployees();
  const { data: routes = [] } = useRoutes({ weekday: selectedWeekday as Weekday });
  const moveAppointment = useMoveAppointment();

  useCloseOnMapClick(onClose, !confirmOpen);

  const targetEmployee = employees.find((emp) => emp.id === selectedUserId);
  const ownRoute = findEmployeeDayRoute(routes, selectedUserId, selectedWeekday, isAreaTourDay);
  if (!patient || !appointment || appointment.id == null) {
    return null;
  }
  const visitTypeLabels = {
    HB: 'Hausbesuch',
    TK: 'Telefonkontakt',
    NA: 'Neuaufnahme',
  };

  const accent = isAreaTourDay ? '#ff9800' : '#007AFF';
  const areaLabel = marker.area || appointment.area || 'Bereich';
  const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : null;
  const overlayLabel = isAreaTourDay
    ? employeeName
      ? `AW ${areaLabel} · ${employeeName}`
      : `AW ${areaLabel}`
    : employeeName || `AW ${areaLabel}`;
  const overlayColor = isAreaTourDay
    ? getTourAreaColor(marker.area || appointment.area)
    : employee
      ? getColorForAdditionalTour(employee.id)
      : getTourAreaColor(marker.area);
  const address = `${patient.street}, ${patient.zip_code} ${patient.city}`;
  const fromLabel = employee
    ? `${employee.first_name} ${employee.last_name}`
    : appointment.area || marker.area || 'unbekannt';
  const toLabel = `${
    targetEmployee ? `${targetEmployee.first_name} ${targetEmployee.last_name}` : 'eigene Tour'
  }${isAreaTourDay && ownRoute?.area ? ` (${ownRoute.area})` : ''}`;

  const handleMove = async () => {
    if (!appointment.id) return;
    try {
      if (isAreaTourDay) {
        const sourceArea = appointment.area || marker.area;
        const targetArea = ownRoute?.area;
        if (!sourceArea || !targetArea) {
          setMoveError('Bitte zuerst eine AW-Tour übernehmen.');
          return;
        }
        await moveAppointment.mutateAsync({
          appointmentId: appointment.id,
          sourceArea,
          targetArea,
        });
      } else {
        const sourceEmployeeId = employee?.id ?? appointment.employee_id;
        if (!sourceEmployeeId || !selectedUserId) {
          setMoveError('Quell- oder Zielmitarbeiter fehlt.');
          return;
        }
        await moveAppointment.mutateAsync({
          appointmentId: appointment.id,
          sourceEmployeeId,
          targetEmployeeId: selectedUserId,
        });
      }
      setConfirmOpen(false);
      onClose();
    } catch (error) {
      console.error('Failed to move appointment:', error);
      setMoveError('Patient konnte nicht verschoben werden.');
    }
  };

  return (
    <>
      <style>{`
        .gm-style-iw-c {
          padding: 0 !important;
          border-radius: 16px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08) !important;
          overflow: hidden !important;
        }
        .gm-style-iw-d {
          overflow: hidden !important;
          max-height: none !important;
        }
        .gm-style-iw-chr,
        button.gm-ui-hover-effect {
          display: none !important;
        }
      `}</style>
      <InfoWindow
        position={marker.position}
        onCloseClick={onClose}
        options={{
          pixelOffset: new google.maps.Size(0, -36),
          maxWidth: 300,
          minWidth: 280,
          headerDisabled: true,
          disableAutoPan: false,
        }}
      >
        <Box sx={{ p: 1.75, width: 268 }}>
          {isAdditionalRoute ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
              <Chip
                label={`Tour: ${overlayLabel}`}
                size="small"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  bgcolor: overlayColor,
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  height: 26,
                  justifyContent: 'flex-start',
                  borderRadius: 1.5,
                  '& .MuiChip-label': {
                    px: 1.25,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }}
              />
              <IconButton
                size="small"
                onClick={onClose}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'rgba(0, 0, 0, 0.06)',
                  color: '#1d1d1f',
                  flexShrink: 0,
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.1)' },
                }}
                aria-label="Schließen"
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          ) : null}

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.25 }}>
            {marker.routePosition ? (
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: isAdditionalRoute ? overlayColor : '#007AFF',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  mt: 0.15,
                }}
              >
                {marker.routePosition}
              </Box>
            ) : null}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, color: '#1d1d1f', lineHeight: 1.25, fontSize: '1rem' }}
              >
                {patient.first_name} {patient.last_name}
              </Typography>
              <Chip
                label={visitTypeLabels[appointment.visit_type]}
                size="small"
                sx={{
                  mt: 0.5,
                  bgcolor: `${getColorForVisitType(appointment.visit_type)}20`,
                  color: getColorForVisitType(appointment.visit_type),
                  fontSize: '0.7rem',
                  height: 20,
                  fontWeight: 600,
                }}
              />
            </Box>
            {!isAdditionalRoute ? (
              <IconButton
                size="small"
                onClick={onClose}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'rgba(0, 0, 0, 0.06)',
                  color: '#1d1d1f',
                  flexShrink: 0,
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.1)' },
                }}
                aria-label="Schließen"
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            ) : null}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.25 }}>
            <IconButton
              aria-label="In Google Maps öffnen"
              onClick={() => openMaps(address)}
              sx={inlineActionSx('#007AFF')}
            >
              <MapIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Typography
              variant="body2"
              sx={{ color: '#1d1d1f', fontWeight: 500, cursor: 'pointer' }}
              onClick={() => openMaps(address)}
            >
              {patient.street}
              <Box
                component="span"
                sx={{ display: 'block', color: '#8E8E93', fontWeight: 400, fontSize: '0.75rem' }}
              >
                {patient.zip_code} {patient.city}
              </Box>
            </Typography>
          </Box>

          {appointment.time ? (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.25 }}>
              <TimeIcon sx={{ fontSize: 18, color: '#8E8E93', mr: 1.25 }} />
              <Typography variant="body2" sx={{ color: '#1d1d1f', fontWeight: 500 }}>
                {appointment.time} Uhr
              </Typography>
            </Box>
          ) : null}

          {(patient.phone1 || patient.phone2) && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.25 }}>
              {patient.phone1 ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton
                    aria-label="Anrufen"
                    onClick={() => callPhone(patient.phone1!)}
                    sx={inlineActionSx('#34C759')}
                  >
                    <PhoneIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  <Typography
                    variant="body2"
                    sx={{ color: '#1d1d1f', cursor: 'pointer' }}
                    onClick={() => callPhone(patient.phone1!)}
                  >
                    {patient.phone1}
                  </Typography>
                </Box>
              ) : null}
              {patient.phone2 ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton
                    aria-label="Anrufen"
                    onClick={() => callPhone(patient.phone2!)}
                    sx={inlineActionSx('#34C759')}
                  >
                    <PhoneIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  <Typography
                    variant="body2"
                    sx={{ color: '#1d1d1f', cursor: 'pointer' }}
                    onClick={() => callPhone(patient.phone2!)}
                  >
                    {patient.phone2}
                  </Typography>
                </Box>
              ) : null}
            </Box>
          )}

          {appointment.info ? (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.25 }}>
              <InfoIcon sx={{ fontSize: 18, color: '#007AFF', mr: 1.25, mt: 0.15 }} />
              <Typography
                variant="body2"
                sx={{
                  color: '#007AFF',
                  bgcolor: 'rgba(0, 122, 255, 0.1)',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontWeight: 500,
                }}
              >
                {appointment.info}
              </Typography>
            </Box>
          ) : null}

          {isAdditionalRoute ? (
            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                setMoveError(null);
                setConfirmOpen(true);
              }}
              sx={{
                mt: 0.25,
                textTransform: 'none',
                borderRadius: 1.5,
                fontWeight: 600,
                bgcolor: accent,
                boxShadow: 'none',
                '&:hover': { bgcolor: isAreaTourDay ? '#f57c00' : '#0062CC', boxShadow: 'none' },
              }}
            >
              Patient verschieben
            </Button>
          ) : null}
        </Box>
      </InfoWindow>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: dialogPaperSx } }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: '#1d1d1f', pb: 0.5, pt: 2.5, px: 2.5 }}>
          Patient verschieben?
        </DialogTitle>
        <DialogContent sx={{ px: 2.5, pb: 1 }}>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {patient.first_name} {patient.last_name} auf die eigene Tour übernehmen?
          </Typography>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: '1px solid rgba(0, 0, 0, 0.08)',
              background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#8E8E93' }}>
              Von
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1d1d1f', mb: 1 }}>
              {fromLabel}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#8E8E93' }}>
              Nach
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1d1d1f' }}>
              {toLabel}
            </Typography>
          </Box>
          {moveError ? (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {moveError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 1.5, gap: 1 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            sx={{ textTransform: 'none', borderRadius: 1.5, color: '#1d1d1f', fontWeight: 600 }}
          >
            Abbrechen
          </Button>
          <Button
            variant="contained"
            disabled={moveAppointment.isPending}
            onClick={handleMove}
            sx={{
              textTransform: 'none',
              borderRadius: 1.5,
              fontWeight: 600,
              bgcolor: accent,
              boxShadow: 'none',
              '&:hover': {
                bgcolor: isAreaTourDay ? '#f57c00' : '#0062CC',
                boxShadow: 'none',
              },
              '&.Mui-disabled': {
                bgcolor: isAreaTourDay ? 'rgba(255, 152, 0, 0.4)' : 'rgba(0, 122, 255, 0.4)',
                color: 'white',
              },
            }}
          >
            {moveAppointment.isPending ? 'Verschiebe…' : 'Verschieben'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
