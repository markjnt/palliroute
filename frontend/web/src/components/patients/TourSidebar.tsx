import React, { useState, useCallback, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Popover,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    CircularProgress,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    DateRange as DateRangeIcon,
    Route as RouteIcon,
    DeleteForever as DeleteForeverIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    CalendarViewWeek as CalendarViewWeekIcon,
    ExpandMore as ExpandMoreIcon,
    RadioButtonChecked as RadioButtonCheckedIcon,
    WarningAmber as WarningIcon
} from '@mui/icons-material';
import { Employee } from '../../types/models';
import { Weekday } from '../../stores/useWeekdayStore';
import { ToursView } from './ToursView';
import { useWeekdayStore, useCalendarWeekStore } from '../../stores';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients, usePatientImport, useCalendarWeeks } from '../../services/queries/usePatients';
import { useLastPatientImportTime } from '../../services/queries/useConfig';
import { useNrwpHolidayForTourDay, useNrwpHolidayLookupForSelectedKw } from '../../hooks';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useRoutes, useOptimizeRoutes, useOptimizeTourAreaRoutes } from '../../services/queries/useRoutes';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useLastUpdateStore } from '../../stores/useLastUpdateStore';
import { useQueryClient } from '@tanstack/react-query';
import { useRouteVisibility } from '../../stores/useRouteVisibilityStore';
import { MAP_HEADER_TOOLBAR_PX } from '../../theme/floatingControlSx';

/** Zwei Buchstaben (Mo … So) + Icons — feste Breite, kein Zucken beim Wochentagswechsel. */
const TOUR_WEEKDAY_BUTTON_WIDTH_PX = 104;

const WEEKDAY_FULL_DE: Record<Weekday, string> = {
    monday: 'Montag',
    tuesday: 'Dienstag',
    wednesday: 'Mittwoch',
    thursday: 'Donnerstag',
    friday: 'Freitag',
    saturday: 'Samstag',
    sunday: 'Sonntag',
};

interface TourPlanSidebarProps {
    width?: number;
}

export const TourPlanSidebar: React.FC<TourPlanSidebarProps> = ({
}) => {
    const { selectedWeekday, setSelectedWeekday } = useWeekdayStore();
    const { 
        selectedCalendarWeek, 
        availableCalendarWeeks, 
        setSelectedCalendarWeek, 
        setAvailableCalendarWeeks,
        getCurrentCalendarWeek 
    } = useCalendarWeekStore();
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [kwAnchorEl, setKwAnchorEl] = useState<null | HTMLElement>(null);
    const [filteredResults, setFilteredResults] = useState<{
        filteredActiveOtherEmployeesWithPatients: Employee[];
        filteredActiveOtherEmployeesWithoutPatients: Employee[];
        filteredDoctors: Employee[];
    }>({
        filteredActiveOtherEmployeesWithPatients: [],
        filteredActiveOtherEmployeesWithoutPatients: [],
        filteredDoctors: []
    });
    
    const { notification, setNotification, closeNotification } = useNotificationStore();
    const { lastPatientImportTime, setLastPatientImportTime } = useLastUpdateStore();
    const [showStaleImportDialog, setShowStaleImportDialog] = useState(false);
    const [staleWarningShown, setStaleWarningShown] = useState(false);

    // Format last update time for display
    const formatLastUpdateTime = (time: Date | null): string => {
        if (!time) return 'Noch nicht aktualisiert';
        
        return 'zuletzt ' + time.toLocaleDateString('de-DE') + ' ' + time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    };
    const queryClient = useQueryClient();
    const { hiddenPolylines, hideAllPolylines, showAllPolylines, showAllMarkers } = useRouteVisibility();

    // React Query Hooks
    const { 
        data: employees = [], 
        isLoading: loadingEmployees 
    } = useEmployees(); // Employees sind kalenderwochenunabhängig!
    
    // Verfügbare Kalenderwochen (effizienter separater Endpoint)
    const {
        data: availableCalendarWeeksFromApi = [],
    } = useCalendarWeeks();
    
    // Gefilterte Patienten für die aktuelle Ansicht (verwendet automatisch selectedCalendarWeek)
    const {
        data: patients = [],
        isLoading: loadingPatients,
        error: patientsError
    } = usePatients();
    
    const {
        data: dayAppointments = [],
        isLoading: loadingAppointments,
        error: appointmentsError
    } = useAppointmentsByWeekday(selectedWeekday);
    
    const {
        data: routes = [],
        isLoading: loadingRoutes,
        error: routesError,
    } = useRoutes({ weekday: selectedWeekday });
    
    const patientImportMutation = usePatientImport();
    const optimizeRoutesMutation = useOptimizeRoutes();
    const optimizeTourAreaRoutesMutation = useOptimizeTourAreaRoutes();
    const { data: lastImportTimeData } = useLastPatientImportTime();

    // Update local store when API data changes
    useEffect(() => {
        if (lastImportTimeData?.last_import_time) {
            setLastPatientImportTime(new Date(lastImportTimeData.last_import_time));
        }
    }, [lastImportTimeData, setLastPatientImportTime]);

    // Show warning dialog if last import is older than 2 hours
    useEffect(() => {
        const effectiveTime =
            lastImportTimeData?.last_import_time
                ? new Date(lastImportTimeData.last_import_time)
                : lastPatientImportTime || null;

        if (!effectiveTime || staleWarningShown) {
            return;
        }

        const now = new Date();
        const diffMs = now.getTime() - effectiveTime.getTime();
        // Schwelle: 2 Stunden
        const twoHoursMs = 2 * 60 * 60 * 1000;

        if (diffMs > twoHoursMs) {
            setShowStaleImportDialog(true);
            setStaleWarningShown(true);
        }
    }, [lastImportTimeData, lastPatientImportTime, staleWarningShown]);

    // Update available calendar weeks when API data changes
    useEffect(() => {
        if (availableCalendarWeeksFromApi.length > 0) {
            setAvailableCalendarWeeks(availableCalendarWeeksFromApi);
        }
    }, [availableCalendarWeeksFromApi, setAvailableCalendarWeeks]);

    // Handle weekday change
    const handleDayChange = useCallback((newWeekday: Weekday) => {
        setSelectedWeekday(newWeekday);
        setAnchorEl(null);
    }, [setSelectedWeekday]);

    // Handle popover open/close
    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    // Handle KW popover open/close
    const handleKwPopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setKwAnchorEl(event.currentTarget);
    };

    const handleKwPopoverClose = () => {
        setKwAnchorEl(null);
    };

    const handleImport = async () => {
        try {
            const result = await patientImportMutation.mutateAsync();
            
            // Add calendar weeks to success message if available
            let message = result.message;
            if (result.calendar_weeks_str) {
                message += ` (KW ${result.calendar_weeks_str})`;
            } else if (result.calendar_week) {
                message += ` (KW ${result.calendar_week})`;
            }
            
            setNotification(message, 'success');
        } catch (error: any) {
            console.error('Error importing patients:', error);
            let message = 'Fehler beim Importieren der Patienten';
            if (error?.response?.data?.error) {
                message = error.response.data.error;
            } else if (error?.message) {
                message = error.message;
            }
            setNotification(message, 'error');
        }
    };

    // Handle clear search
    const handleClearSearch = () => {
        setSearchTerm('');
    };

    // Memoize the filtered results change handler
    const handleFilteredResultsChange = useCallback((results: {
        filteredActiveOtherEmployeesWithPatients: Employee[];
        filteredActiveOtherEmployeesWithoutPatients: Employee[];
        filteredDoctors: Employee[];
    }) => {
        setFilteredResults(results);
    }, []);

    const getWeekdayAbbrev = useCallback((day: Weekday): string => {
        const abbrev: Record<Weekday, string> = {
            monday: 'Mo',
            tuesday: 'Di',
            wednesday: 'Mi',
            thursday: 'Do',
            friday: 'Fr',
            saturday: 'Sa',
            sunday: 'So',
        };
        return abbrev[day] || '?';
    }, []);

    // Get current weekday
    const getCurrentWeekday = useCallback((): Weekday => {
        const days: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[new Date().getDay()];
    }, []);

    const currentWeekday = getCurrentWeekday();

    const { isAreaTourDay } = useNrwpHolidayForTourDay(selectedWeekday);
    const getHolidayName = useNrwpHolidayLookupForSelectedKw();

    // Check if selected KW matches current KW
    const currentWeek = getCurrentCalendarWeek();
    const isCurrentWeek = selectedCalendarWeek && selectedCalendarWeek === currentWeek;

    
    // Loading and error states
    const isLoading = loadingPatients || loadingEmployees || loadingAppointments || loadingRoutes;

    const error = (() => {
        if (patientsError instanceof Error) return patientsError.message;
        if (appointmentsError instanceof Error) return appointmentsError.message;
        if (routesError instanceof Error) return routesError.message;
        return null;
    })();

    const handleOptimizeAllRoutes = async () => {
        if (!routes.length) return;

        setIsOptimizing(true);
        try {
            if (isAreaTourDay) {
                const tourAreaLabels = ['Nord', 'Mitte', 'Süd'];
                const optimizationPromises = tourAreaLabels.map(area =>
                    optimizeTourAreaRoutesMutation.mutateAsync({
                        weekday: selectedWeekday.toLowerCase(),
                        area: area
                    })
                );
                await Promise.all(optimizationPromises);
                setNotification('Alle Wochenend-Routen wurden erfolgreich optimiert', 'success');
            } else {
                // Optimize weekday routes by employee
                const employeeIdsWithRoute = routes
                    .filter(route => route.employee_id !== undefined && route.employee_id !== null)
                    .map(route => route.employee_id);

                const employeesWithRoute = employees.filter(
                    emp => emp.id !== undefined && employeeIdsWithRoute.includes(emp.id)
                );

                const optimizationPromises = employeesWithRoute.map(employee =>
                    optimizeRoutesMutation.mutateAsync({
                        weekday: selectedWeekday.toLowerCase(),
                        employeeId: employee.id as number
                    })
                );

                await Promise.all(optimizationPromises);
                setNotification('Alle Routen für den Tag wurden erfolgreich optimiert', 'success');
            }

            await queryClient.invalidateQueries();
        } catch (error) {
            setNotification('Fehler beim Optimieren der Routen', 'error');
        } finally {
            setIsOptimizing(false);
        }
    };

    // Check if there's any data
    const hasData = patients.length > 0 || dayAppointments.length > 0 || routes.length > 0;

    // Toggle all polylines visibility
    const allRouteIds = routes.map(r => r.id);
    const allHidden = allRouteIds.length > 0 && allRouteIds.every(id => hiddenPolylines.has(id));
    const allVisible = allRouteIds.length > 0 && allRouteIds.every(id => !hiddenPolylines.has(id));
    const handleToggleAllPolylines = () => {
      if (!allRouteIds.length) return;
      if (!allVisible) {
        showAllPolylines();
        showAllMarkers(); // Marker auch zurücksetzen!
      } else {
        hideAllPolylines(allRouteIds);
        // Marker NICHT beeinflussen!
      }
    };

    useEffect(() => {
        showAllPolylines();
    }, [selectedWeekday, showAllPolylines]);

    return (
        <Box
            sx={{
                height: '100%',
                width: '100%',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'nowrap',
                pt: 2,
                pb: 2,
                pr: 2,
                pl: 8,
                height: 64,
                borderBottom: 1,
                borderColor: 'divider',
            }}>
                <Typography variant="h6" component="h2" sx={{ pl: 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Touren
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    {/* Kalenderwoche: Toggle bei genau zwei KW, sonst Popover */}
                    {selectedCalendarWeek && availableCalendarWeeks.length === 2 ? (
                        <Box
                            role="group"
                            aria-label="Kalenderwoche wählen"
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'stretch',
                                height: MAP_HEADER_TOOLBAR_PX,
                                boxSizing: 'border-box',
                                flexShrink: 0,
                                borderRadius: 2,
                                overflow: 'hidden',
                                bgcolor: 'background.paper',
                                boxShadow: (theme) => `inset 0 0 0 1px ${theme.palette.divider}`,
                            }}
                        >
                            {[...availableCalendarWeeks].sort((a, b) => a - b).map((week, idx) => {
                                const selected = selectedCalendarWeek === week;
                                const isKwThisSegmentCurrentIso = week === currentWeek;
                                return (
                                    <Button
                                        key={week}
                                        variant="text"
                                        size="small"
                                        disableElevation
                                        onClick={() => setSelectedCalendarWeek(week)}
                                        aria-label={
                                            isKwThisSegmentCurrentIso
                                                ? `Kalenderwoche ${week} (aktuelle Woche)`
                                                : `Kalenderwoche ${week}`
                                        }
                                        aria-pressed={selected}
                                        sx={{
                                            alignSelf: 'stretch',
                                            flex: '1 1 0',
                                            minWidth: 0,
                                            height: 'auto',
                                            minHeight: 0,
                                            py: 0,
                                            px: 1.25,
                                            borderRadius: 4,
                                            border: 'none',
                                            borderRight:
                                                idx === 0
                                                    ? (t) => `1px solid ${t.palette.divider}`
                                                    : 'none',
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            fontSize: '0.8125rem',
                                            whiteSpace: 'nowrap',
                                            lineHeight: 1.2,
                                            ...(selected
                                                ? isKwThisSegmentCurrentIso
                                                    ? {
                                                          color: 'success.contrastText',
                                                          backgroundColor: 'success.main',
                                                          boxShadow: (theme) =>
                                                              `0 1px 2px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.12)'}`,
                                                          '&:hover': {
                                                              backgroundColor: 'success.dark',
                                                          },
                                                      }
                                                    : {
                                                          color: 'primary.contrastText',
                                                          backgroundColor: 'primary.main',
                                                          boxShadow: (theme) =>
                                                              `0 1px 2px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.12)'}`,
                                                          '&:hover': {
                                                              backgroundColor: 'primary.dark',
                                                          },
                                                      }
                                                : {
                                                      color: 'text.secondary',
                                                      backgroundColor: 'transparent',
                                                      '&:hover': {
                                                          backgroundColor: 'rgba(0, 0, 0, 0.06)',
                                                      },
                                                  }),
                                        }}
                                    >
                                        KW {week}
                                    </Button>
                                );
                            })}
                        </Box>
                    ) : (
                        selectedCalendarWeek && (
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handleKwPopoverOpen}
                                startIcon={<CalendarViewWeekIcon sx={{ fontSize: 18 }} />}
                                endIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}
                                sx={{
                                    minWidth: 'auto',
                                    height: MAP_HEADER_TOOLBAR_PX,
                                    minHeight: MAP_HEADER_TOOLBAR_PX,
                                    maxHeight: MAP_HEADER_TOOLBAR_PX,
                                    boxSizing: 'border-box',
                                    py: 0,
                                    px: 1.25,
                                    justifyContent: 'space-between',
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    fontSize: '0.8125rem',
                                    borderColor: isCurrentWeek ? 'success.main' : 'primary.main',
                                    color: isCurrentWeek ? 'success.main' : 'primary.main',
                                    backgroundColor: isCurrentWeek ? 'success.50' : 'primary.50',
                                    '&:hover': {
                                        borderColor: isCurrentWeek ? 'success.dark' : 'primary.dark',
                                        backgroundColor: isCurrentWeek ? 'success.100' : 'primary.50',
                                    },
                                }}
                            >
                                KW {selectedCalendarWeek}
                            </Button>
                        )
                    )}
                    
                    {/* Weekday Selector Button */}
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={handlePopoverOpen}
                        aria-label={`Wochentag ${WEEKDAY_FULL_DE[selectedWeekday]}`}
                        aria-haspopup="listbox"
                        startIcon={<DateRangeIcon sx={{ fontSize: 18 }} />}
                        endIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}
                        sx={{
                            width: TOUR_WEEKDAY_BUTTON_WIDTH_PX,
                            minWidth: TOUR_WEEKDAY_BUTTON_WIDTH_PX,
                            maxWidth: TOUR_WEEKDAY_BUTTON_WIDTH_PX,
                            flexShrink: 0,
                            height: MAP_HEADER_TOOLBAR_PX,
                            minHeight: MAP_HEADER_TOOLBAR_PX,
                            maxHeight: MAP_HEADER_TOOLBAR_PX,
                            boxSizing: 'border-box',
                            py: 0,
                            px: 1.25,
                            justifyContent: 'space-between',
                            textTransform: 'none',
                            fontSize: '0.8125rem',
                            fontWeight: currentWeekday === selectedWeekday ? 700 : 500,
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            position: 'relative',
                            '&:hover': {
                                borderColor: 'primary.dark',
                                backgroundColor: 'primary.50',
                            }
                        }}
                    >
                        {getWeekdayAbbrev(selectedWeekday)}
                        {/* Current day indicator */}
                        {currentWeekday === selectedWeekday && (
                            <Box
                                sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    backgroundColor: '#007AFF',
                                    position: 'absolute',
                                    top: '50%',
                                    right: 26,
                                    transform: 'translateY(-50%)',
                                    border: '1px solid rgba(0, 122, 255, 0.2)',
                                    boxShadow: '0 1px 2px rgba(0, 122, 255, 0.3)',
                                }}
                            />
                        )}
                    </Button>
                </Box>
            </Box>

            {/* Weekday Selection Popover */}
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handlePopoverClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                PaperProps={{
                    sx: {
                        minWidth: 200,
                        mt: 1,
                        borderRadius: 2,
                        boxShadow: 3,
                    }
                }}
            >
                <List sx={{ p: 1 }}>
                    {(
                        [
                            { value: 'monday' as const, isWeekend: false },
                            { value: 'tuesday' as const, isWeekend: false },
                            { value: 'wednesday' as const, isWeekend: false },
                            { value: 'thursday' as const, isWeekend: false },
                            { value: 'friday' as const, isWeekend: false },
                            { value: 'saturday' as const, isWeekend: true },
                            { value: 'sunday' as const, isWeekend: true },
                        ] as const
                    ).map((day) => {
                        const holidayLabel = getHolidayName(day.value as Weekday);
                        const useOrangeRow = day.isWeekend || Boolean(holidayLabel);
                        return (
                        <ListItem key={day.value} disablePadding>
                            <ListItemButton
                                onClick={() => handleDayChange(day.value as Weekday)}
                                selected={selectedWeekday === day.value}
                                sx={{
                                    borderRadius: 1,
                                    mb: 0.5,
                                    backgroundColor: useOrangeRow ? 'warning.50' : 'transparent',
                                    position: 'relative',
                                    alignItems: 'flex-start',
                                    py: holidayLabel ? 1 : 0.5,
                                    '&.Mui-selected': {
                                        backgroundColor: useOrangeRow ? 'warning.main' : 'primary.main',
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: useOrangeRow ? 'warning.dark' : 'primary.dark',
                                        }
                                    },
                                    '&:hover': {
                                        backgroundColor: useOrangeRow ? 'warning.100' : 'primary.50',
                                    }
                                }}
                            >
                                <ListItemText 
                                    primary={WEEKDAY_FULL_DE[day.value]}
                                    secondary={holidayLabel ? `Feiertag: ${holidayLabel}` : undefined}
                                    primaryTypographyProps={{
                                        fontWeight: selectedWeekday === day.value ? 600 : (currentWeekday === day.value ? 500 : 400),
                                        fontSize: '0.875rem',
                                        color: useOrangeRow && selectedWeekday !== day.value ? 'warning.dark' : 'inherit'
                                    }}
                                    secondaryTypographyProps={holidayLabel ? {
                                        fontSize: '0.72rem',
                                        lineHeight: 1.2,
                                        sx: {
                                            mt: 0.35,
                                            color: selectedWeekday === day.value
                                                ? 'rgba(255, 255, 255, 0.9)'
                                                : 'warning.dark',
                                        },
                                    } : undefined}
                                />
                                {/* Current day indicator */}
                                {currentWeekday === day.value && (
                                    <Box
                                        sx={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            backgroundColor: '#007AFF',
                                            position: 'absolute',
                                            top: '50%',
                                            right: 8,
                                            transform: 'translateY(-50%)',
                                            border: '1px solid rgba(0, 122, 255, 0.2)',
                                            boxShadow: '0 1px 2px rgba(0, 122, 255, 0.3)',
                                        }}
                                    />
                                )}
                            </ListItemButton>
                        </ListItem>
                    );
                    })}
                </List>
            </Popover>

            {/* Calendar Week Selection Popover (nur wenn nicht zwei KW / Toggle) */}
            {availableCalendarWeeks.length !== 2 && (
                <Popover
                    open={Boolean(kwAnchorEl)}
                    anchorEl={kwAnchorEl}
                    onClose={handleKwPopoverClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    PaperProps={{
                        sx: {
                            minWidth: 150,
                            mt: 1,
                            borderRadius: 2,
                            boxShadow: 3,
                        },
                    }}
                >
                    <List sx={{ p: 1 }}>
                        {availableCalendarWeeks.map((week) => {
                            const isCurrentWeekItem = week === getCurrentCalendarWeek();
                            const isSelected = week === selectedCalendarWeek;

                            return (
                                <ListItem key={week} disablePadding>
                                    <ListItemButton
                                        onClick={() => {
                                            setSelectedCalendarWeek(week);
                                            handleKwPopoverClose();
                                        }}
                                        selected={isSelected}
                                        sx={{
                                            borderRadius: 1,
                                            mb: 0.5,
                                            backgroundColor: isCurrentWeekItem ? 'success.50' : 'transparent',
                                            '&.Mui-selected': {
                                                backgroundColor: isCurrentWeekItem ? 'success.main' : 'primary.main',
                                                color: 'white',
                                                '&:hover': {
                                                    backgroundColor: isCurrentWeekItem ? 'success.dark' : 'primary.dark',
                                                },
                                            },
                                            '&:hover': {
                                                backgroundColor: isCurrentWeekItem ? 'success.100' : 'primary.50',
                                            },
                                        }}
                                    >
                                        <ListItemText
                                            primary={`KW ${week}`}
                                            primaryTypographyProps={{
                                                fontWeight: isSelected ? 600 : 400,
                                                fontSize: '0.875rem',
                                                color: isCurrentWeekItem && !isSelected ? 'success.dark' : 'inherit',
                                            }}
                                        />
                                        {isCurrentWeekItem && (
                                            <Box
                                                sx={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    backgroundColor: isSelected ? 'white' : 'success.main',
                                                    ml: 1,
                                                    opacity: 0.9,
                                                }}
                                            />
                                        )}
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>
                </Popover>
            )}

            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        fullWidth
                        startIcon={patientImportMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                        onClick={handleImport}
                        disabled={!employees.length || patientImportMutation.isPending}
                    >
                        {patientImportMutation.isPending ? 'Importiere...' : `PalliDOC Import${(lastImportTimeData?.last_import_time || lastPatientImportTime) ? ` (${formatLastUpdateTime(lastImportTimeData?.last_import_time ? new Date(lastImportTimeData.last_import_time) : lastPatientImportTime)})` : ''}`}
                    </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<RouteIcon />}
                        onClick={handleOptimizeAllRoutes}
                        disabled={isOptimizing || !routes.length}
                    >
                        {isOptimizing ? 'Optimierung läuft...' : 'Alle Routen optimieren'}
                    </Button>
                    <Button
                        variant="outlined"
                        fullWidth
                        startIcon={!allVisible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        onClick={handleToggleAllPolylines}
                        disabled={!routes.length}
                    >
                        {!allVisible ? 'Alle Routen einblenden' : 'Alle Routen ausblenden'}
                    </Button>
                </Box>
            </Box>

            <Divider />

            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                <ToursView
                    selectedDay={selectedWeekday}
                    searchTerm={searchTerm}
                    filteredResults={filteredResults}
                    onSearchChange={setSearchTerm}
                    onClearSearch={handleClearSearch}
                    onFilteredResultsChange={handleFilteredResultsChange}
                />
            </Box>
            
            {/* Dialog: Warnung bei altem Import mit Möglichkeit zum direkten PalliDOC Import */}
            <Dialog
                open={showStaleImportDialog}
                onClose={() => setShowStaleImportDialog(false)}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="warning" />
                    PalliDOC-Import ist veraltet
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Der letzte PalliDOC-Import liegt mehr als zwei Stunden zurück.
                        Möchten Sie jetzt einen PalliDOC-Import starten, um mit aktuellen Daten zu arbeiten?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowStaleImportDialog(false)}>
                        Später
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={async () => {
                            setShowStaleImportDialog(false);
                            await handleImport();
                        }}
                        autoFocus
                        disabled={patientImportMutation.isPending || !employees.length}
                    >
                        PalliDOC-Import jetzt starten
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}; 