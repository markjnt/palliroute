import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  MenuList,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Event as EventIcon,
  AddLocation as AddLocationIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Menu as MenuIcon,
  ChangeCircle as ChangeCircleIcon,
  PictureAsPdf as PictureAsPdfIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { MapContainerProps, MarkerData } from '../../types/mapTypes';
import {
  containerStyle,
  defaultCenter,
  defaultZoom,
  mapOptions,
  libraries,
  MAP_MIN_ZOOM,
  MAP_MAX_ZOOM,
  createEmployeeMarkerData,
  createPatientMarkerData,
  createTourAreaMarkerData,
  createTourPatientMarkerData,
  parseRouteOrder,
} from '../../utils/mapUtils';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useRoutes } from '../../services/queries/useRoutes';
import { MapMarkers } from './MapMarkers';
import { RoutePolylines } from './RoutePolylines';
import { AddCustomMarkerDialog } from './AddCustomMarkerDialog';
import { PflegeheimeDialog } from './PflegeheimeDialog';
import { routeLineColors, getColorForTour } from '../../utils/colors';
import { Weekday } from '../../types/models';
import { useCalendarWeekStore } from '../../stores/useCalendarWeekStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useDownloadRoutePdf } from '../../services/queries/useRoutes';
import AreaSelection from '../area_select/AreaSelection';
import { useCustomMarkerStore } from '../../stores/useCustomMarkerStore';
import { useNrwpHolidayForTourDay } from '../../hooks';
import { usePflegeheime } from '../../services/queries/usePflegeheime';
import { usePflegeheimeVisibilityStore } from '../../stores/usePflegeheimeVisibilityStore';
import {
  mapFloatingControlSx,
  mapFloatingSurfaceSx,
  mapToolbarIconButtonSx,
  MAP_HEADER_TOOLBAR_PX,
  MAP_OVERLAY_TOP_PX,
} from '../../theme/floatingControlSx';

/**
 * Main container component for the map that integrates all map features
 */
export const MapContainer: React.FC<MapContainerProps> = ({
  apiKey,
  selectedWeekday,
  userArea
}) => {
  const navigate = useNavigate();
  const customMarker = useCustomMarkerStore((s) => s.marker);
  const setCustomMarker = useCustomMarkerStore((s) => s.setMarker);
  const clearCustomMarker = useCustomMarkerStore((s) => s.clearMarker);
  const [addMarkerDialogOpen, setAddMarkerDialogOpen] = useState(false);
  const [pflegeheimeDialogOpen, setPflegeheimeDialogOpen] = useState(false);
  const [mapMenuAnchor, setMapMenuAnchor] = useState<null | HTMLElement>(null);
  /** Nur für `onClose`-Grund „menuItemClick“ beim PDF-Eintrag: Menü nicht zuklappen (Backdrop/Escape weiter möglich). */
  const suppressMenuCloseFromPdfItemRef = useRef(false);
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const { selectedCalendarWeek } = useCalendarWeekStore();
  const { setNotification } = useNotificationStore();
  const downloadPdfMutation = useDownloadRoutePdf();
  const { data: pflegeheime = [] } = usePflegeheime();
  const showPflegeheimeOnMap = usePflegeheimeVisibilityStore((s) => s.showPflegeheimeOnMap);
  const toggleShowPflegeheimeOnMap = usePflegeheimeVisibilityStore((s) => s.toggleShowPflegeheimeOnMap);

  // Load Google Maps API
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
    language: 'de',
    region: 'DE'
  });

  // Map state
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(defaultZoom);

  useEffect(() => {
    if (!map) return undefined;
    const syncZoom = () => setZoomLevel(map.getZoom() ?? defaultZoom);
    syncZoom();
    const listener = map.addListener('zoom_changed', syncZoom);
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map]);

  const zoomIn = useCallback(() => {
    if (!map) return;
    const z = map.getZoom() ?? defaultZoom;
    map.setZoom(Math.min(z + 1, MAP_MAX_ZOOM));
  }, [map]);

  const zoomOut = useCallback(() => {
    if (!map) return;
    const z = map.getZoom() ?? defaultZoom;
    map.setZoom(Math.max(z - 1, MAP_MIN_ZOOM));
  }, [map]);

  const handleDownloadPdf = useCallback(async () => {
    if (!selectedCalendarWeek) {
      setNotification('Bitte wählen Sie eine Kalenderwoche aus', 'error');
      return;
    }
    try {
      await downloadPdfMutation.mutateAsync({
        calendarWeek: selectedCalendarWeek,
        selectedWeekday: selectedWeekday as Weekday,
      });
      setNotification(`ZIP für KW ${selectedCalendarWeek} erfolgreich heruntergeladen`, 'success');
    } catch (e) {
      console.error('Error downloading PDF:', e);
      setNotification('Fehler beim Herunterladen des PDFs', 'error');
    }
  }, [selectedCalendarWeek, selectedWeekday, downloadPdfMutation, setNotification]);

  const { isAreaTourDay } = useNrwpHolidayForTourDay(selectedWeekday as Weekday);

  // Data hooks - verwenden automatisch selectedCalendarWeek aus dem Store
  const { data: employees = [], isLoading: employeesLoading, refetch: refetchEmployees } = useEmployees();
  const { data: patients = [], isLoading: patientsLoading, error: patientsError, refetch: refetchPatients } = usePatients();
  const { data: appointments = [], isLoading: appointmentsLoading, error: appointmentsError, refetch: refetchAppointments } = useAppointmentsByWeekday(selectedWeekday as Weekday);
  const { data: routes = [], isLoading: routesLoading, error: routesError, refetch: refetchRoutes } = useRoutes({ 
    weekday: selectedWeekday as Weekday,
    tour_area_day: isAreaTourDay,
  });

  // Nur die passenden Routen für den Tag und die Area
  const isAllAreas = userArea === 'Nord- und Südkreis' || !userArea;
  const dayRoutes = useMemo(
    () => {
      if (isAreaTourDay) {
        // Weekend / Feiertags-AW: Mitte + Nord/Süd je nach userArea
        return routes.filter(route => {
          if (route.weekday !== selectedWeekday) return false;
          if (isAllAreas) return true;
          // Always show Mitte
          if ((route.area as string) === 'Mitte') return true;
          // Filter others based on userArea - handle both "Nordkreis"/"Nord" and "Südkreis"/"Süd"
          if (userArea === 'Nordkreis' || userArea === 'Nord') return (route.area as string) === 'Nord';
          if (userArea === 'Südkreis' || userArea === 'Süd') return (route.area as string) === 'Süd';
          return false;
        });
      } else {
        // Weekday routes - handle both "Nordkreis"/"Nord" and "Südkreis"/"Süd"
        let targetArea = userArea;
        if (userArea === 'Nord') {
          targetArea = 'Nordkreis';
        } else if (userArea === 'Süd') {
          targetArea = 'Südkreis';
        }
        return routes.filter(route => route.weekday === selectedWeekday && (isAllAreas || route.area === targetArea));
      }
    },
    [routes, selectedWeekday, userArea, isAllAreas, isAreaTourDay]
  );

  // Sichtbare Routen-IDs für den Tag
  const visibleRouteIds = dayRoutes.map(r => r.id);

  // Marker-Berechnung mit useMemo
  const markers = useMemo((): MarkerData[] => {
    if (!isLoaded) return [];
    const newMarkers: MarkerData[] = [];
    
    if (isAreaTourDay) {
      // Wochenende / Feiertag: Startmarker je Bereich + AW-Patientenmarker
      
      // Get unique areas from visible routes
      const visibleAreas = new Set<string>();
      dayRoutes.forEach(route => {
        if (route.area) {
          visibleAreas.add(route.area as string);
        }
      });
      
      // If no routes but we're in weekend mode, show all areas or based on userArea
      if (visibleAreas.size === 0) {
        if (isAllAreas) {
          visibleAreas.add('Nord');
          visibleAreas.add('Mitte');
          visibleAreas.add('Süd');
        } else {
          // Always show Mitte
          visibleAreas.add('Mitte');
          // Add selected area
          if (userArea === 'Nordkreis' || userArea === 'Nord') {
            visibleAreas.add('Nord');
          } else if (userArea === 'Südkreis' || userArea === 'Süd') {
            visibleAreas.add('Süd');
          }
        }
      }
      
      // Create weekend start marker for each visible area
      visibleAreas.forEach(area => {
        const marker = createTourAreaMarkerData(area);
        if (marker) newMarkers.push(marker);
      });
      
      // AW-Patientenmarker (Sa/So und Feiertags-Mo–Fr): Nummer aus route_order der Flächenroute
      if (patients.length > 0 && appointments.length > 0) {
        const awTourAppointments = appointments.filter(a => 
          a.weekday === selectedWeekday && 
          (a.visit_type === 'HB' || a.visit_type === 'NA') &&
          !a.employee_id
        );
        
        const tourFlacheAreas = new Set(['Nord', 'Mitte', 'Süd']);
        const appointmentPositions = new Map<number, { position: number; routeId: number; area?: string }>();
        routes.forEach(route => {
          if (
            route.weekday === selectedWeekday &&
            route.area &&
            tourFlacheAreas.has(String(route.area))
          ) {
            const routeOrder = parseRouteOrder(route.route_order);
            routeOrder.forEach((appointmentId, idx) => {
              appointmentPositions.set(appointmentId, { position: idx + 1, routeId: route.id, area: route.area });
            });
          }
        });
        
        for (const appointment of awTourAppointments) {
          const patient = patients.find(p => p.id === appointment.patient_id);
          if (patient) {
            const posInfo = appointment.id ? appointmentPositions.get(appointment.id) : undefined;
            const position = posInfo ? posInfo.position : undefined;
            const routeId = posInfo ? posInfo.routeId : undefined;
            const area = posInfo ? posInfo.area : appointment.area;
            
            // Prüfe, ob die Route sichtbar ist
            const isInactive = !routeId || !visibleRouteIds.includes(routeId);
            const baseMarker = createTourPatientMarkerData(patient, appointment, area || 'Unknown', position, routeId);
            if (baseMarker) {
              const marker = { ...baseMarker, isInactive };
              newMarkers.push(marker);
            }
          }
        }
      }
    } else {
      // Weekday logic: Show employees and regular patient markers
      // Alle Mitarbeiter mit Koordinaten als Marker anzeigen
      for (const employee of employees) {
        if (employee.latitude && employee.longitude) {
          // Finde ggf. die Route für diesen Mitarbeiter am ausgewählten Tag
          const route = routes.find(r => r.employee_id === employee.id && r.weekday === selectedWeekday);
          const marker = createEmployeeMarkerData(employee, route?.id);
          if (marker) newMarkers.push(marker);
        }
      }
      
      // Appointments/Patients
      if (patients.length > 0 && appointments.length > 0) {
        // Nur HB- und NA-Termine (Hausbesuch und Neuaufnahme)
        const appointmentsForDay = appointments.filter(a => a.weekday === selectedWeekday && (a.visit_type === 'HB' || a.visit_type === 'NA'));
        const appointmentPositions = new Map();
        routes.forEach(route => {
          const routeOrder = parseRouteOrder(route.route_order);
          routeOrder.forEach((appointmentId, idx) => {
            appointmentPositions.set(appointmentId, { position: idx + 1, routeId: route.id });
          });
        });
        for (const appointment of appointmentsForDay) {
          const patient = patients.find(p => p.id === appointment.patient_id);
          if (patient) {
            const posInfo = appointment.id ? appointmentPositions.get(appointment.id) : undefined;
            const position = posInfo ? posInfo.position : undefined;
            const routeId = posInfo ? posInfo.routeId : undefined;
            // Prüfe, ob die Route sichtbar ist
            const isInactive = !routeId || !visibleRouteIds.includes(routeId);
            const baseMarker = createPatientMarkerData(patient, appointment, position, routeId);
            if (baseMarker) {
              // Area der zugehörigen Route ermitteln
              const routeArea = routeId ? routes.find(r => r.id === routeId)?.area : undefined;
              const marker = { ...baseMarker, isInactive, routeArea };
              newMarkers.push(marker);
            }
          }
        }
      }
    }
    
    // Custom-Marker hinzufügen
    if (customMarker) {
      newMarkers.push({
        position: new google.maps.LatLng(customMarker.lat, customMarker.lng),
        title: customMarker.name,
        type: 'custom',
        customAddress: customMarker.address,
      });
    }

    // Pflegeheim-Marker (wenn Sichtbarkeit aktiv)
    if (showPflegeheimeOnMap && pflegeheime.length > 0) {
      for (const p of pflegeheime) {
        if (p.latitude != null && p.longitude != null) {
          newMarkers.push({
            position: new google.maps.LatLng(p.latitude, p.longitude),
            title: p.name,
            type: 'pflegeheim' as const,
            customAddress: p.address ?? `${p.street}, ${p.zip_code} ${p.city}`,
          });
        }
      }
    }

    return newMarkers;
  }, [isLoaded, employees, patients, appointments, routes, selectedWeekday, visibleRouteIds, isAreaTourDay, customMarker, showPflegeheimeOnMap, pflegeheime]);

  // Route-Polylines
  const routePaths = useMemo(() => {
    return dayRoutes.map(route => {
      if (isAreaTourDay) {
        // AW-Flächenrouten (Wochenende / Feiertag) – ggf. mit employee_id
        const getAreaColor = (area?: string) => {
          switch (area) {
            case 'Nord': return '#1976d2';
            case 'Mitte': return '#7b1fa2';
            case 'Süd': return '#388e3c';
            default: return '#ff9800';
          }
        };
        const color = getAreaColor(route.area as string);
        const employee = employees.find(e => e.id === route.employee_id);
        const employeeName = employee 
          ? `${employee.first_name} ${employee.last_name} (AW ${route.area})`
          : `AW-Tour ${route.area}`;
        return {
          employeeId: route.employee_id || null,
          routeId: route.id,
          routeOrder: parseRouteOrder(route.route_order),
          color,
          polyline: route.polyline,
          totalDistance: route.total_distance || 0,
          totalDuration: route.total_duration || 0,
          employeeName
        };
      } else {
        // Weekday routes - employee-based
        const employee = employees.find(e => e.id === route.employee_id);
        const color = employee?.id ? getColorForTour(employee.id) : '#9E9E9E';
        return {
          employeeId: route.employee_id,
          routeId: route.id,
          routeOrder: parseRouteOrder(route.route_order),
          color,
          polyline: route.polyline,
          totalDistance: route.total_distance || 0,
          totalDuration: route.total_duration || 0,
          employeeName: employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee'
        };
      }
    });
  }, [dayRoutes, employees, isAreaTourDay]);

  // Fehler- und Ladezustände
  const isLoading = employeesLoading || patientsLoading || appointmentsLoading || routesLoading || !isLoaded;
  const error = mapError || (patientsError instanceof Error ? patientsError.message : null) || (appointmentsError instanceof Error ? appointmentsError.message : null) || (routesError instanceof Error ? routesError.message : null);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Karten-Menü: Bereich, RB/AW, PDF — links oben */}
      <Box
        sx={{
          position: 'absolute',
          top: MAP_OVERLAY_TOP_PX,
          left: 16,
          zIndex: 1000,
          height: MAP_HEADER_TOOLBAR_PX,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Button
          variant="outlined"
          color="primary"
          size="small"
          onClick={(e) => setMapMenuAnchor(e.currentTarget)}
          aria-label="Kartenmenü"
          title="Kartenmenü"
          sx={mapToolbarIconButtonSx}
        >
          <MenuIcon fontSize="small" sx={{ color: 'primary.main' }} />
        </Button>
        <Menu
          anchorEl={mapMenuAnchor}
          open={Boolean(mapMenuAnchor)}
          onClose={(_event, reason) => {
            // MUI Menu leitet Schließen nach Eintrag-Klick weiter (Popover-Typung ohne menuItemClick).
            if (
              String(reason) === 'menuItemClick' &&
              suppressMenuCloseFromPdfItemRef.current
            ) {
              return;
            }
            setMapMenuAnchor(null);
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                minWidth: 240,
                mt: 0.5,
                ...mapFloatingSurfaceSx,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2.5,
                py: 0.5,
              },
            },
          }}
        >
          <MenuList dense autoFocusItem sx={{ py: 0.5, px: 0.5 }}>
            <MenuItem
              onClick={() => {
                setMapMenuAnchor(null);
                setAreaDialogOpen(true);
              }}
              sx={{
                borderRadius: 2,
                minHeight: 40,
                py: 1,
                px: 1.25,
                gap: 1,
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                <ChangeCircleIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Gebiet wählen"
                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
              />
            </MenuItem>
            <MenuItem
              onClick={() => {
                suppressMenuCloseFromPdfItemRef.current = true;
                void handleDownloadPdf().finally(() => {
                  suppressMenuCloseFromPdfItemRef.current = false;
                  setMapMenuAnchor(null);
                });
              }}
              disabled={downloadPdfMutation.isPending || !selectedCalendarWeek}
              sx={{
                borderRadius: 2,
                minHeight: 40,
                py: 1,
                px: 1.25,
                gap: 1,
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'error.main' }}>
                {downloadPdfMutation.isPending ? (
                  <CircularProgress size={18} sx={{ color: 'error.main' }} />
                ) : (
                  <PictureAsPdfIcon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary="PDFs herunterladen"
                secondary={
                  selectedCalendarWeek ? `Kalenderwoche ${selectedCalendarWeek}` : 'Keine KW gewählt'
                }
                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
              />
            </MenuItem>
            <Divider component="li" sx={{ my: 0.75, borderColor: 'divider', listStyle: 'none' }} />
            <MenuItem
              onClick={() => {
                setMapMenuAnchor(null);
                navigate('/rbawplan');
              }}
              sx={{
                borderRadius: 2,
                minHeight: 40,
                py: 1,
                px: 1.25,
                gap: 1,
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                <EventIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="RB/AW Planung"
                secondary="Wechsel zur Planungsansicht"
                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
              />
              <OpenInNewIcon fontSize="small" sx={{ color: 'text.secondary', ml: 0.5, flexShrink: 0 }} />
            </MenuItem>
          </MenuList>
        </Menu>
        <AreaSelection
          compact
          hideCompactButton
          dialogOpen={areaDialogOpen}
          onDialogOpenChange={setAreaDialogOpen}
        />
      </Box>

      {/* Pflegeheime — oben rechts */}
      <Box
        sx={{
          position: 'absolute',
          top: MAP_OVERLAY_TOP_PX,
          right: 16,
          zIndex: 1000,
          height: MAP_HEADER_TOOLBAR_PX,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'stretch',
            height: MAP_HEADER_TOOLBAR_PX,
            borderRadius: 2.5,
            ...mapFloatingSurfaceSx,
            border: '1px solid',
            borderColor: 'success.light',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          <Button
            onClick={() => setPflegeheimeDialogOpen(true)}
            variant="outlined"
            color="success"
            startIcon={<BusinessIcon sx={{ color: 'success.main', fontSize: 20 }} />}
            size="small"
            sx={{
              height: MAP_HEADER_TOOLBAR_PX,
              minHeight: MAP_HEADER_TOOLBAR_PX,
              maxHeight: MAP_HEADER_TOOLBAR_PX,
              py: 0,
              px: 1.25,
              borderRadius: 0,
              border: 'none',
              boxShadow: 'none',
              boxSizing: 'border-box',
              ...mapFloatingControlSx,
              color: 'success.main',
              fontWeight: 600,
              textTransform: 'none',
              justifyContent: 'center',
              '& .MuiButton-startIcon': { mr: 0.75 },
              '&:hover': {
                border: 'none',
                boxShadow: 'none',
              },
            }}
          >
            Pflegeheime
          </Button>
          <Button
            variant="outlined"
            color="success"
            size="small"
            onClick={toggleShowPflegeheimeOnMap}
            title={showPflegeheimeOnMap ? 'Pflegeheime auf Karte ausblenden' : 'Pflegeheime auf Karte anzeigen'}
            aria-label={
              showPflegeheimeOnMap ? 'Pflegeheime auf Karte ausblenden' : 'Pflegeheime auf Karte anzeigen'
            }
            sx={{
              ...mapToolbarIconButtonSx,
              borderRadius: 0,
              border: 'none',
              borderLeft: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
              color: showPflegeheimeOnMap ? 'success.main' : 'action.active',
              '&:hover': {
                bgcolor: 'grey.100',
                border: 'none',
                borderLeft: '1px solid',
                borderColor: 'divider',
                boxShadow: 'none',
              },
            }}
          >
            {showPflegeheimeOnMap ? (
              <VisibilityIcon fontSize="small" sx={{ color: 'success.main' }} />
            ) : (
              <VisibilityOffIcon fontSize="small" />
            )}
          </Button>
        </Box>
      </Box>

      <AddCustomMarkerDialog
        open={addMarkerDialogOpen}
        onClose={() => setAddMarkerDialogOpen(false)}
        onSuccess={(name, address, lat, lng) => {
          setCustomMarker({ name, address, lat, lng });
          setAddMarkerDialogOpen(false);
        }}
      />

      <PflegeheimeDialog
        open={pflegeheimeDialogOpen}
        onClose={() => setPflegeheimeDialogOpen(false)}
      />

      {/* Marker + Zoom — unten rechts */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 24,
          right: 16,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 1,
        }}
      >
        {customMarker ? (
          <Button
            onClick={clearCustomMarker}
            variant="outlined"
            color="warning"
            size="small"
            aria-label="Eigenen Marker entfernen"
            sx={{ ...mapFloatingControlSx, minWidth: 40, width: 40, height: 40, p: 0, alignSelf: 'flex-end' }}
          >
            <DeleteIcon fontSize="small" />
          </Button>
        ) : (
          <Button
            onClick={() => setAddMarkerDialogOpen(true)}
            variant="outlined"
            color="warning"
            size="small"
            aria-label="Eigenen Marker setzen"
            sx={{ ...mapFloatingControlSx, minWidth: 40, width: 40, height: 40, p: 0, alignSelf: 'flex-end' }}
          >
            <AddLocationIcon fontSize="small" />
          </Button>
        )}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            borderRadius: 2.5,
            ...mapFloatingSurfaceSx,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
        <IconButton
          size="small"
          onClick={zoomIn}
          disabled={zoomLevel >= MAP_MAX_ZOOM}
          aria-label="Einzoomen"
          title="Einzoomen"
          sx={{
            borderRadius: 0,
            width: 40,
            height: 40,
            bgcolor: 'background.paper',
            '&:hover': { bgcolor: 'grey.100' },
          }}
        >
          <ZoomInIcon />
        </IconButton>
        <Divider flexItem sx={{ borderColor: 'divider', opacity: 1 }} />
        <IconButton
          size="small"
          onClick={zoomOut}
          disabled={zoomLevel <= MAP_MIN_ZOOM}
          aria-label="Rauszoomen"
          title="Rauszoomen"
          sx={{
            borderRadius: 0,
            width: 40,
            height: 40,
            bgcolor: 'background.paper',
            '&:hover': { bgcolor: 'grey.100' },
          }}
        >
          <ZoomOutIcon />
        </IconButton>
        </Box>
      </Box>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={defaultZoom}
        onLoad={setMap}
        onUnmount={() => setMap(null)}
        options={mapOptions}
      >
        <RoutePolylines routes={routePaths} map={map} />
        <MapMarkers
          markers={markers}
          patients={patients}
          employees={employees}
          appointments={appointments}
          userArea={userArea}
          routes={routes}
        />
      </GoogleMap>
    </Box>
  );
};