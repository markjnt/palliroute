import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Done as DoneIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { Sheet } from 'react-modal-sheet';
import { useAuth } from '@palliroute/auth';
import { getColorForAdditionalTour, employeeTypeColors } from '@palliroute/shared';
import { useEmployees } from '../../services/queries/useEmployees';
import { useRoutes } from '../../services/queries/useRoutes';
import { useAuthMe } from '../../services/queries/useAuthMe';
import { useUserStore } from '../../stores/useUserStore';
import { useAdditionalRoutesStore } from '../../stores/useAdditionalRoutesStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { Employee, Weekday } from '../../types/models';
import { useDeferredSheetMount } from '../../hooks/useDeferredSheetMount';
import { EmployeeFilterChips, EmployeePickCard, AreaPickCard } from './EmployeePickCard';
import { filterEmployees } from './filterEmployees';
import AdminEmployeeSelectSheet from './AdminEmployeeSelectSheet';
import { useNrwpHolidayForTourDay } from '../../hooks/useNrwpHolidayForTourDay';
import { AW_TOUR_AREAS, findAwAreaRoute, findEmployeeDayRoute } from '../../utils/mapUtils';

const ADDITIONAL_ROUTE_FILTERS = [
  { id: 'all', label: 'Alle' },
  { id: 'pflege-nord', label: 'Nord', color: employeeTypeColors.default },
  { id: 'pflege-sued', label: 'Süd', color: employeeTypeColors.default },
  { id: 'arzt', label: 'Arzt', color: employeeTypeColors.Arzt },
];

interface AdditionalRoutesSheetProps {
  open: boolean;
  onClose: () => void;
}

function LogoutPickCard({ onLogout }: { onLogout: () => void }) {
  return (
    <Card
      onClick={onLogout}
      sx={{
        cursor: 'pointer',
        borderRadius: 2,
        border: '1px solid rgba(0, 0, 0, 0.08)',
        background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
        },
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'rgba(255, 59, 48, 0.12)',
              color: '#FF3B30',
            }}
          >
            <LogoutIcon />
          </Avatar>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, color: '#FF3B30', fontSize: '0.95rem' }}
          >
            Abmelden
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export const AdditionalRoutesSheet: React.FC<AdditionalRoutesSheetProps> = ({ open, onClose }) => {
  const { shouldRender, onCloseEnd } = useDeferredSheetMount(open);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [adminSelectOpen, setAdminSelectOpen] = useState(false);
  const { data: employees = [], isLoading, error } = useEmployees();
  const { selectedUserId } = useUserStore();
  const { selectedEmployeeIds, selectedAreas, toggleEmployee, toggleArea, deselectAll } =
    useAdditionalRoutesStore();
  const { selectedWeekday } = useWeekdayStore();
  const { data: me } = useAuthMe();
  const { logout, configured, isAuthenticated } = useAuth();
  const isAdmin = Boolean(me?.is_admin);
  const showLogout = configured && isAuthenticated;
  const { data: routes = [] } = useRoutes({ weekday: selectedWeekday as Weekday });
  const { isAreaTourDay } = useNrwpHolidayForTourDay(selectedWeekday as Weekday);
  const selectedEmployee = employees.find((emp) => emp.id === selectedUserId);

  const employeesWithRoutes = useMemo(() => {
    return employees.filter(
      (emp) =>
        emp.id !== selectedUserId &&
        Boolean(findEmployeeDayRoute(routes, emp.id, selectedWeekday, isAreaTourDay))
    );
  }, [employees, routes, selectedUserId, selectedWeekday, isAreaTourDay]);

  const filteredEmployees = useMemo(
    () => filterEmployees(employeesWithRoutes, searchTerm, activeFilter),
    [employeesWithRoutes, searchTerm, activeFilter]
  );

  const ownRoute = useMemo(
    () => findEmployeeDayRoute(routes, selectedUserId, selectedWeekday, isAreaTourDay),
    [routes, selectedUserId, selectedWeekday, isAreaTourDay]
  );

  const otherAwAreas = useMemo(() => {
    if (!isAreaTourDay) return [];
    const ownArea = ownRoute?.area;
    return AW_TOUR_AREAS.filter((area) => area !== ownArea)
      .map((area) => {
        const route = findAwAreaRoute(routes, area, selectedWeekday);
        if (!route) return null;
        const assigned = route.employee_id
          ? employees.find((emp) => emp.id === route.employee_id)
          : undefined;
        return {
          area,
          assignedName: assigned ? `${assigned.first_name} ${assigned.last_name}` : null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [isAreaTourDay, ownRoute?.area, routes, selectedWeekday, employees]);

  const hasOverlaySelection = isAreaTourDay
    ? selectedAreas.length > 0
    : selectedEmployeeIds.length > 0;

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      <Sheet
        isOpen={open}
        onClose={onClose}
        onCloseEnd={onCloseEnd}
        initialSnap={0}
        snapPoints={[0.85, 0]}
      >
        <Sheet.Container>
          <Sheet.Header>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '8px 0',
                cursor: 'grab',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '4px',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '8px',
                }}
              />
            </div>

            <Box sx={{ px: 3, pb: 1 }}>
              <Box
                sx={{
                  mb: isAreaTourDay ? 0 : 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: '#1d1d1f', flex: 1, minWidth: 0 }}
                >
                  Weitere Routen anzeigen
                </Typography>
                {isAdmin ? (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setAdminSelectOpen(true)}
                    sx={{
                      flexShrink: 0,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {selectedEmployee
                      ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
                      : 'Mitarbeiter wählen'}
                  </Button>
                ) : null}
                {isAreaTourDay ? (
                  <>
                    <IconButton
                      aria-label="Routenauswahl aufheben"
                      onClick={deselectAll}
                      disabled={!hasOverlaySelection}
                      sx={{
                        flexShrink: 0,
                        width: '48px',
                        height: '48px',
                        bgcolor: 'rgba(0, 0, 0, 0.06)',
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.1)' },
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                    <IconButton
                      onClick={onClose}
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        flexShrink: 0,
                        width: '48px',
                        height: '48px',
                        '&:hover': { bgcolor: 'primary.dark' },
                      }}
                      aria-label="Fertig"
                    >
                      <DoneIcon />
                    </IconButton>
                  </>
                ) : null}
              </Box>

              {isAreaTourDay ? null : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      placeholder="Mitarbeiter suchen..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                        endAdornment: searchTerm ? (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="Suche leeren"
                              onClick={() => setSearchTerm('')}
                              edge="end"
                              size="small"
                            >
                              <CloseIcon />
                            </IconButton>
                          </InputAdornment>
                        ) : undefined,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          height: 48,
                          borderRadius: 2,
                        },
                      }}
                    />
                    <IconButton
                      onClick={onClose}
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        flexShrink: 0,
                        width: '48px',
                        height: '48px',
                        '&:hover': { bgcolor: 'primary.dark' },
                      }}
                      aria-label="Fertig"
                    >
                      <DoneIcon />
                    </IconButton>
                  </Box>
                  <EmployeeFilterChips
                    activeFilter={activeFilter}
                    onChange={setActiveFilter}
                    filters={ADDITIONAL_ROUTE_FILTERS}
                    trailing={
                      <IconButton
                        aria-label="Routenauswahl aufheben"
                        onClick={deselectAll}
                        disabled={!hasOverlaySelection}
                        sx={{
                          flexShrink: 0,
                          bgcolor: 'rgba(0, 0, 0, 0.06)',
                          '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.1)' },
                        }}
                      >
                        <CloseIcon />
                      </IconButton>
                    }
                  />
                </>
              )}
            </Box>
          </Sheet.Header>

          <Sheet.Content>
            <Sheet.Scroller draggableAt="top">
              <Box sx={{ px: 3, pt: 1, pb: 2 }}>
                {isLoading ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <Typography color="text.secondary">
                      {isAreaTourDay ? 'Lade Bereiche...' : 'Lade Mitarbeiter...'}
                    </Typography>
                  </Box>
                ) : error ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <Typography color="error">
                      {isAreaTourDay
                        ? 'Fehler beim Laden der Bereiche'
                        : 'Fehler beim Laden der Mitarbeiter'}
                    </Typography>
                  </Box>
                ) : isAreaTourDay ? (
                  otherAwAreas.length === 0 ? (
                    <Box display="flex" flexDirection="column" alignItems="center" py={4}>
                      <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography color="text.secondary">
                        Keine weiteren Bereiche für diesen Tag
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={1.5}>
                      {otherAwAreas.map(({ area, assignedName }) => (
                        <Grid size={{ xs: 12, sm: 6 }} key={area}>
                          <AreaPickCard
                            area={area}
                            assignedName={assignedName}
                            selected={selectedAreas.includes(area)}
                            onClick={() => toggleArea(area)}
                          />
                        </Grid>
                      ))}
                      {showLogout ? (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <LogoutPickCard onLogout={() => logout()} />
                        </Grid>
                      ) : null}
                    </Grid>
                  )
                ) : filteredEmployees.length === 0 ? (
                  <Box display="flex" flexDirection="column" alignItems="center" py={4}>
                    <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography color="text.secondary">
                      {searchTerm
                        ? 'Keine Mitarbeiter gefunden'
                        : 'Keine weiteren Routen für diesen Tag'}
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={1.5}>
                    {filteredEmployees.map((employee: Employee) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={employee.id}>
                        <EmployeePickCard
                          employee={employee}
                          selected={selectedEmployeeIds.includes(employee.id as number)}
                          accentColor={getColorForAdditionalTour(employee.id)}
                          onClick={() => toggleEmployee(employee.id as number)}
                        />
                      </Grid>
                    ))}
                    {showLogout ? (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <LogoutPickCard onLogout={() => logout()} />
                      </Grid>
                    ) : null}
                  </Grid>
                )}
                {showLogout &&
                (isLoading ||
                  error ||
                  (isAreaTourDay ? otherAwAreas.length === 0 : filteredEmployees.length === 0)) ? (
                  <Box sx={{ mt: 1.5 }}>
                    <LogoutPickCard onLogout={() => logout()} />
                  </Box>
                ) : null}
              </Box>
            </Sheet.Scroller>
          </Sheet.Content>
        </Sheet.Container>
      </Sheet>

      {isAdmin ? (
        <AdminEmployeeSelectSheet
          open={adminSelectOpen}
          onClose={() => setAdminSelectOpen(false)}
        />
      ) : null}
    </>
  );
};

export default AdditionalRoutesSheet;
