import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Home as HomeIcon,
  Phone as PhoneIcon,
  AddCircle as AddCircleIcon,
  type SvgIconComponent,
} from '@mui/icons-material';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { useCalendarWeekStore } from '../../stores/useCalendarWeekStore';
import { usePatients, patientKeys } from '../../services/queries/usePatients';
import { useAppointments, appointmentKeys } from '../../services/queries/useAppointments';
import { useRoutes, useAssignAwTourEmployee, routeKeys } from '../../services/queries/useRoutes';
import { useEmployees } from '../../services/queries/useEmployees';
import { useUserStore } from '../../stores/useUserStore';
import {
  useCalendarWeek,
  useCalendarWeeks,
  calendarWeekKeys,
} from '../../services/queries/useCalendarWeek';
import { Route, Weekday } from '../../types/models';
import { useQueryClient } from '@tanstack/react-query';
import { getCurrentCalendarWeek, getTourAreaColor, isAwTourArea } from '@palliroute/shared';
import { useNrwpHolidayLookupForSelectedKw } from '../../hooks/useNrwpHolidayForTourDay';
import { findEmployeeDayRoute } from '../../utils/mapUtils';
import {
  isAwCalendarDay,
  resolveWeekdayAfterWeekChange,
} from '../../utils/resolveWeekdayAfterWeekChange';
import { AreaPickCard } from '../user/EmployeePickCard';

const AW_AREAS = ['Nord', 'Mitte', 'Süd'] as const;

function VisitTypeCount({
  icon: Icon,
  count,
  color,
}: {
  icon: SvgIconComponent;
  count: number;
  color: string;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.25,
        width: '100%',
        minWidth: 0,
      }}
    >
      <Icon sx={{ fontSize: 13, color }} />
      <Box
        component="span"
        sx={{
          minWidth: 14,
          height: 12,
          px: 0.3,
          borderRadius: 0.75,
          bgcolor: `${color}14`,
          border: `1px solid ${color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.55rem',
          fontWeight: 700,
          lineHeight: 1,
          color,
        }}
      >
        {count}
      </Box>
    </Box>
  );
}

const getAwAreaLetter = (area?: string | null): 'N' | 'M' | 'S' | null => {
  if (area === 'Nord') return 'N';
  if (area === 'Mitte') return 'M';
  if (area === 'Süd') return 'S';
  return null;
};

interface WeekdaySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onWeekdaySelect: (weekday: string) => void;
}

export const WeekdaySelector: React.FC<WeekdaySelectorProps> = ({ isOpen, onWeekdaySelect }) => {
  const { selectedWeekday, setSelectedWeekday } = useWeekdayStore();
  const selectedCalendarWeek = useCalendarWeekStore((state) => state.selectedCalendarWeek);
  const setSelectedCalendarWeek = useCalendarWeekStore((state) => state.setSelectedCalendarWeek);
  const availableCalendarWeeks = useCalendarWeekStore((state) => state.availableCalendarWeeks);
  const setAvailableCalendarWeeks = useCalendarWeekStore(
    (state) => state.setAvailableCalendarWeeks
  );
  const { selectedUserId } = useUserStore();
  const queryClient = useQueryClient();

  const { data: patients = [] } = usePatients();
  const { data: allAppointments = [] } = useAppointments();
  const { data: allRoutes = [] } = useRoutes();
  const { data: employees = [] } = useEmployees();
  const { data: bestCalendarWeek } = useCalendarWeek();
  const { data: fetchedCalendarWeeks = [] } = useCalendarWeeks();
  const assignAwTourEmployee = useAssignAwTourEmployee();
  const currentCalendarWeek = useMemo(() => getCurrentCalendarWeek(), []);
  const getHolidayName = useNrwpHolidayLookupForSelectedKw();

  const [claimWeekday, setClaimWeekday] = useState<Weekday | null>(null);
  const [claimArea, setClaimArea] = useState<(typeof AW_AREAS)[number]>('Nord');
  const [feedback, setFeedback] = useState<{
    message: string;
    severity: 'success' | 'warning' | 'error';
  } | null>(null);

  useEffect(() => {
    if (bestCalendarWeek && !selectedCalendarWeek) {
      setSelectedCalendarWeek(bestCalendarWeek);
    }
  }, [bestCalendarWeek, selectedCalendarWeek, setSelectedCalendarWeek]);

  useEffect(() => {
    if (fetchedCalendarWeeks.length > 0) {
      setAvailableCalendarWeeks(fetchedCalendarWeeks);
    }
  }, [fetchedCalendarWeeks, setAvailableCalendarWeeks]);

  const sortedCalendarWeeks = useMemo(() => {
    const weeks = [...availableCalendarWeeks];
    weeks.sort((a, b) => a - b);
    return weeks;
  }, [availableCalendarWeeks]);

  const getGermanWeekday = (weekday: string): string => {
    const weekdayMap: Record<string, string> = {
      monday: 'Mo',
      tuesday: 'Di',
      wednesday: 'Mi',
      thursday: 'Do',
      friday: 'Fr',
      saturday: 'Sa',
      sunday: 'So',
    };
    return weekdayMap[weekday] || weekday;
  };

  const getCurrentWeekday = () => {
    const today = new Date().getDay();
    const weekdayMap = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return weekdayMap[today] as Weekday;
  };

  const handleCalendarWeekChange = async (week: number) => {
    setSelectedCalendarWeek(week);
    queryClient.setQueryData(calendarWeekKeys.best(), week);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: patientKeys.all, exact: false }),
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all, exact: false }),
      queryClient.invalidateQueries({ queryKey: routeKeys.all, exact: false }),
    ]);

    const freshRoutes = (queryClient.getQueryData<Route[]>(routeKeys.list(undefined)) ?? []).filter(
      (route) => route.calendar_week == null || route.calendar_week === week
    );
    const currentSelected = useWeekdayStore.getState().selectedWeekday;
    const nextWeekday = resolveWeekdayAfterWeekChange({
      selectedWeekday: currentSelected,
      today: getCurrentWeekday(),
      isAwDay: (day) => isAwCalendarDay(day, getHolidayName(day, week)),
      hasAssignedAwTour: (day) =>
        Boolean(findEmployeeDayRoute(freshRoutes, selectedUserId, day, true)),
    });
    if (nextWeekday !== currentSelected) {
      setSelectedWeekday(nextWeekday);
    }
  };

  const currentWeekday = getCurrentWeekday();

  const weekdays = useMemo(() => {
    const defs: Array<{ value: Weekday; label: string }> = [
      { value: 'monday', label: 'Montag' },
      { value: 'tuesday', label: 'Dienstag' },
      { value: 'wednesday', label: 'Mittwoch' },
      { value: 'thursday', label: 'Donnerstag' },
      { value: 'friday', label: 'Freitag' },
      { value: 'saturday', label: 'Samstag' },
      { value: 'sunday', label: 'Sonntag' },
    ];

    return defs.map((d) => {
      const holidayName = getHolidayName(d.value);
      const isAwDay = isAwCalendarDay(d.value, holidayName);
      const assignedRoute = isAwDay
        ? findEmployeeDayRoute(allRoutes, selectedUserId, d.value, true)
        : undefined;
      return {
        ...d,
        holidayName,
        isAwDay,
        assigned: Boolean(assignedRoute),
        assignedArea: assignedRoute?.area,
      };
    });
  }, [getHolidayName, allRoutes, selectedUserId]);

  const getEmployeeAppointments = (weekday: Weekday, isAwDay: boolean, assignedArea?: string) => {
    if (isAwDay) {
      if (!assignedArea) return [];
      return allAppointments.filter((a) => a.weekday === weekday && a.area === assignedArea);
    }
    return allAppointments.filter((a) => a.employee_id === selectedUserId && a.weekday === weekday);
  };

  const getPatientsByVisitType = (
    appointments: typeof allAppointments,
    visitType: 'HB' | 'NA' | 'TK'
  ) => {
    const typeAppointments = appointments.filter((a) => a.visit_type === visitType);
    const patientIds = Array.from(new Set(typeAppointments.map((a) => a.patient_id)));
    return patientIds.map((id) => patients.find((p) => p.id === id)).filter((p) => p !== undefined);
  };

  const claimRoute = claimWeekday
    ? allRoutes.find(
        (route) =>
          route.weekday === claimWeekday && isAwTourArea(route.area) && route.area === claimArea
      )
    : undefined;
  const claimOwner = claimRoute?.employee_id
    ? employees.find((emp) => emp.id === claimRoute.employee_id)
    : undefined;
  const claimDayLabel = weekdays.find((day) => day.value === claimWeekday)?.label ?? '';

  const handleDayClick = (weekday: (typeof weekdays)[number]) => {
    if (weekday.isAwDay && !weekday.assigned) {
      setClaimArea('Nord');
      setClaimWeekday(weekday.value);
      return;
    }
    onWeekdaySelect(weekday.value);
  };

  const handleClaimConfirm = async () => {
    if (!claimWeekday || !selectedUserId || !claimRoute?.id) {
      setFeedback({
        message: claimRoute
          ? 'Bitte wählen Sie einen Mitarbeiter'
          : 'Keine AW-Tour für diesen Bereich',
        severity: 'error',
      });
      return;
    }

    try {
      const result = await assignAwTourEmployee.mutateAsync({
        routeId: claimRoute.id,
        employeeId: selectedUserId,
      });
      if (result.planning_failed) {
        setFeedback({
          message:
            'Tour übernommen, die Route konnte aber nicht neu berechnet werden. Bitte „Optimieren“ nutzen.',
          severity: 'warning',
        });
      } else {
        setFeedback({ message: 'AW-Tour übernommen', severity: 'success' });
      }
      onWeekdaySelect(claimWeekday);
      setClaimWeekday(null);
    } catch (error) {
      console.error('Failed to claim AW tour:', error);
      setFeedback({ message: 'Tour konnte nicht übernommen werden', severity: 'error' });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          top: 58,
          left: 28,
          right: 28,
          height: 'auto',
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10000,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 0.5,
            px: 0.75,
            pt: 1.5,
            pb: 0.5,
          }}
        >
          {weekdays.map((weekday) => {
            const dayAppointments = getEmployeeAppointments(
              weekday.value,
              weekday.isAwDay,
              weekday.assignedArea
            );
            const hbPatients = getPatientsByVisitType(dayAppointments, 'HB');
            const tkPatients = getPatientsByVisitType(dayAppointments, 'TK');
            const naPatients = getPatientsByVisitType(dayAppointments, 'NA');
            const areaLetter = weekday.isAwDay ? getAwAreaLetter(weekday.assignedArea) : null;

            const isSelected = selectedWeekday === weekday.value;
            const isUnassignedAw = weekday.isAwDay && !weekday.assigned;
            const accent = weekday.isAwDay ? '#ff9800' : '#007AFF';

            return (
              <Box
                key={weekday.value}
                onClick={() => handleDayClick(weekday)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  width: '100%',
                  minWidth: 0,
                  overflow: 'hidden',
                  borderRadius: 2,
                  cursor: 'pointer',
                  bgcolor: isSelected
                    ? `${accent}1A`
                    : weekday.isAwDay
                      ? 'rgba(255, 152, 0, 0.08)'
                      : 'transparent',
                  border: isSelected ? `1px solid ${accent}33` : '1px solid transparent',
                  position: 'relative',
                  px: 0.65,
                  pt: 0.75,
                  pb: 0.75,
                  opacity: isUnassignedAw ? 0.45 : 1,
                  filter: isUnassignedAw ? 'grayscale(0.7)' : 'none',
                  '&:active': {
                    bgcolor: isSelected ? `${accent}26` : 'rgba(0, 0, 0, 0.05)',
                    transform: 'scale(0.95)',
                  },
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Box
                  sx={{
                    height: 8,
                    mb: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {currentWeekday === weekday.value ? (
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: accent,
                        border: `1px solid ${accent}33`,
                        boxShadow: `0 1px 2px ${accent}4D`,
                      }}
                    />
                  ) : null}
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: currentWeekday === weekday.value ? 700 : 600,
                    fontSize: '0.7rem',
                    color: isSelected ? accent : '#1d1d1f',
                    mb: 0.2,
                  }}
                >
                  {getGermanWeekday(weekday.value)}
                </Typography>

                <Box
                  sx={{
                    height: 12,
                    mb: 0.35,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {weekday.holidayName ? (
                    <Typography
                      title={`Feiertag: ${weekday.holidayName}`}
                      variant="caption"
                      sx={{
                        display: 'block',
                        fontSize: '0.5rem',
                        lineHeight: 1.15,
                        color: 'warning.dark',
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                      }}
                    >
                      {weekday.holidayName}
                    </Typography>
                  ) : null}
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.2,
                    width: '100%',
                    mb: 0.35,
                  }}
                >
                  <VisitTypeCount icon={HomeIcon} count={hbPatients.length} color="#007AFF" />
                  <VisitTypeCount icon={PhoneIcon} count={tkPatients.length} color="#4caf50" />
                  <VisitTypeCount icon={AddCircleIcon} count={naPatients.length} color="#FF3B30" />
                </Box>

                {areaLetter ? (
                  <Box
                    title={`AW ${weekday.assignedArea}`}
                    aria-label={`AW-Bereich ${weekday.assignedArea}`}
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      bgcolor: getTourAreaColor(weekday.assignedArea),
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.55rem',
                      fontWeight: 700,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    {areaLetter}
                  </Box>
                ) : null}
              </Box>
            );
          })}
        </Box>

        <Box sx={{ px: 1, pt: 0.25, pb: 1, display: 'flex', gap: 1, alignItems: 'stretch' }}>
          {(sortedCalendarWeeks.length > 0
            ? sortedCalendarWeeks
            : [selectedCalendarWeek].filter(Boolean)
          ).map((week) => {
            const isCurrent = week === currentCalendarWeek;
            const isSelected = week === selectedCalendarWeek;
            return (
              <Button
                key={week}
                variant="text"
                onClick={() => handleCalendarWeekChange(week as number)}
                sx={{
                  flex: 1,
                  color: isSelected ? '#ffffff' : isCurrent ? '#2e7d32' : '#007AFF',
                  fontWeight: isSelected ? 700 : 600,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  minWidth: 0,
                  borderRadius: 1.5,
                  border: isSelected
                    ? '1px solid transparent'
                    : isCurrent
                      ? '1px solid rgba(76, 175, 80, 0.4)'
                      : '1px solid rgba(0, 122, 255, 0.2)',
                  bgcolor: isSelected
                    ? isCurrent
                      ? '#2e7d32'
                      : '#007AFF'
                    : isCurrent
                      ? 'rgba(76, 175, 80, 0.12)'
                      : 'rgba(0, 122, 255, 0.08)',
                  boxShadow: isSelected ? '0 1px 4px rgba(0, 0, 0, 0.18)' : 'none',
                  '&:hover': {
                    backgroundColor: isSelected
                      ? isCurrent
                        ? '#1b5e20'
                        : '#0066d6'
                      : isCurrent
                        ? 'rgba(56, 142, 60, 0.2)'
                        : 'rgba(0, 122, 255, 0.15)',
                  },
                }}
              >
                KW {week}
              </Button>
            );
          })}
        </Box>
      </Box>

      <Dialog
        open={Boolean(claimWeekday)}
        onClose={() => setClaimWeekday(null)}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              bgcolor: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              mx: 2,
              overflow: 'hidden',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            color: '#1d1d1f',
            pb: 0.5,
            pt: 2.5,
            px: 2.5,
          }}
        >
          Tour übernehmen?
        </DialogTitle>
        <DialogContent sx={{ px: 2.5, pb: 1 }}>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {claimWeekday ? `Möchten Sie die AW-Tour am ${claimDayLabel} übernehmen?` : ''}
          </Typography>
          {claimOwner && claimOwner.id !== selectedUserId && (
            <Alert
              severity="warning"
              sx={{
                mb: 2,
                borderRadius: 2,
                bgcolor: 'rgba(255, 152, 0, 0.12)',
                color: '#e65100',
                '& .MuiAlert-icon': { color: '#ff9800' },
              }}
            >
              Diese Tour gehört derzeit {claimOwner.first_name} {claimOwner.last_name}.
            </Alert>
          )}
          <Typography
            variant="caption"
            sx={{ display: 'block', mb: 1, fontWeight: 600, color: '#1d1d1f' }}
          >
            Bereich
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {AW_AREAS.map((area) => {
              const areaRoute = claimWeekday
                ? allRoutes.find(
                    (route) =>
                      route.weekday === claimWeekday &&
                      isAwTourArea(route.area) &&
                      route.area === area
                  )
                : undefined;
              const owner = areaRoute?.employee_id
                ? employees.find((emp) => emp.id === areaRoute.employee_id)
                : undefined;
              return (
                <AreaPickCard
                  key={area}
                  area={area}
                  assignedName={owner ? `${owner.first_name} ${owner.last_name}` : null}
                  selected={claimArea === area}
                  onClick={() => setClaimArea(area)}
                />
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 1.5, gap: 1 }}>
          <Button
            onClick={() => setClaimWeekday(null)}
            sx={{
              textTransform: 'none',
              borderRadius: 1.5,
              color: '#1d1d1f',
              fontWeight: 600,
              '&:hover': { bgcolor: 'transparent' },
            }}
          >
            Abbrechen
          </Button>
          <Button
            variant="contained"
            onClick={handleClaimConfirm}
            disabled={assignAwTourEmployee.isPending || !claimRoute}
            sx={{
              textTransform: 'none',
              borderRadius: 1.5,
              fontWeight: 600,
              bgcolor: '#ff9800',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#ff9800', boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: 'rgba(255, 152, 0, 0.4)', color: 'white' },
            }}
          >
            {assignAwTourEmployee.isPending ? 'Übernehme…' : 'Übernehmen'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={5000}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {feedback ? (
          <Alert severity={feedback.severity} onClose={() => setFeedback(null)} variant="filled">
            {feedback.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
};
