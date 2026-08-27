import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  EventAvailable as DutiesIcon,
  People as PeopleIcon,
  History as HistoryIcon,
  Refresh as OverwriteIcon,
  Lock as RespectIcon,
  MoreTime as OverplanningIcon,
  CloudSync as AplanoIcon,
} from '@mui/icons-material';
import { formatMonthYear } from '../../../utils/oncall/dateUtils';
import {
  EmployeePlanningPreference,
  AutoPlanScope,
  DEFAULT_AUTO_PLAN_SCOPE,
  isAutoPlanScopeEmpty,
} from '../../../services/api/scheduling';
import { useEmployees } from '../../../services/queries/useEmployees';
import {
  useEmployeeCapacities,
  useEmployeePlanningPreferences,
  useUpsertEmployeePlanningPreferences,
} from '../../../services/queries/useScheduling';
import {
  AutoPlanningEmployeeTable,
  createDefaultEmployeePreferences,
  toStoredPreferences,
} from './AutoPlanningEmployeeTable';
import { AutoPlanningDutyScope } from './AutoPlanningDutyScope';
import {
  AutoPlanningSection,
  AutoPlanningOptionCard,
  AutoPlanningSwitchRow,
} from './AutoPlanningSection';

export interface AutoPlanningSettings {
  existingAssignmentsHandling: 'overwrite' | 'respect';
  allowOverplanning: boolean;
  includeAplano: boolean;
  employeePreferences: EmployeePlanningPreference[];
  planScope: AutoPlanScope;
}

interface AutoPlanningDialogProps {
  open: boolean;
  onClose: () => void;
  onStart: (settings: AutoPlanningSettings, timeAccountFile?: File | null) => void;
  onReset?: () => void;
  currentDate: Date;
  isLoading?: boolean;
  isResetting?: boolean;
  viewMode?: 'month' | 'week';
}

export const AutoPlanningDialog: React.FC<AutoPlanningDialogProps> = ({
  open,
  onClose,
  onStart,
  onReset,
  currentDate,
  isLoading = false,
  isResetting = false,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = formatMonthYear(currentDate);
  const [settings, setSettings] = useState<AutoPlanningSettings>({
    existingAssignmentsHandling: 'respect',
    allowOverplanning: false,
    includeAplano: true,
    employeePreferences: [],
    planScope: { ...DEFAULT_AUTO_PLAN_SCOPE },
  });
  const [employeePrefsMap, setEmployeePrefsMap] = useState<
    Record<number, EmployeePlanningPreference>
  >({});
  const [planScope, setPlanScope] = useState<AutoPlanScope>({
    ...DEFAULT_AUTO_PLAN_SCOPE,
  });
  const [dutyScopeError, setDutyScopeError] = useState<string | null>(null);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const monthParam = `${year}-${String(month + 1).padStart(2, '0')}`;

  const { data: employees = [] } = useEmployees();
  const { data: employeeCapacities = [] } = useEmployeeCapacities({
    month: monthParam,
  });
  const { data: savedPrefs = [], isLoading: savedPrefsLoading } =
    useEmployeePlanningPreferences(open);
  const savePrefsMutation = useUpsertEmployeePlanningPreferences();

  const includedCount = useMemo(
    () => Object.values(employeePrefsMap).filter((p) => p.included).length,
    [employeePrefsMap]
  );
  const totalPlanable = useMemo(() => Object.keys(employeePrefsMap).length, [employeePrefsMap]);

  useEffect(() => {
    if (!open || employees.length === 0 || savedPrefsLoading) return;
    const defaults = createDefaultEmployeePreferences(employees, employeeCapacities, savedPrefs);
    setEmployeePrefsMap(defaults);
    setPlanScope({ ...DEFAULT_AUTO_PLAN_SCOPE });
    setDutyScopeError(null);
    setEmployeeError(null);
  }, [open, employees, employeeCapacities, savedPrefs, savedPrefsLoading]);

  const handlePlanScopeChange = (next: AutoPlanScope) => {
    setPlanScope(next);
    if (!isAutoPlanScopeEmpty(next)) {
      setDutyScopeError(null);
    }
  };

  const handleEmployeePrefsChange = (next: Record<number, EmployeePlanningPreference>) => {
    setEmployeePrefsMap(next);
    if (Object.values(next).some((p) => p.included)) {
      setEmployeeError(null);
    }
  };

  const handleStart = async () => {
    if (isAutoPlanScopeEmpty(planScope)) {
      setDutyScopeError('Bitte mindestens eine Dienstgruppe für die Planung auswählen.');
      setEmployeeError(null);
      return;
    }
    const includedPrefs = Object.values(employeePrefsMap).filter((p) => p.included);
    if (includedPrefs.length === 0) {
      setDutyScopeError(null);
      setEmployeeError('Bitte mindestens einen Mitarbeiter für die Planung auswählen.');
      return;
    }
    setDutyScopeError(null);
    setEmployeeError(null);
    try {
      await savePrefsMutation.mutateAsync(toStoredPreferences(employeePrefsMap));
    } catch {
      setEmployeeError('Präferenzen konnten nicht gespeichert werden.');
      return;
    }
    onStart(
      {
        ...settings,
        employeePreferences: Object.values(employeePrefsMap),
        planScope,
      },
      null
    );
  };

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="lg"
      fullWidth
      disableEscapeKeyDown={isLoading}
      PaperProps={{
        sx: {
          borderRadius: 4,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: 2,
          pt: 4,
          px: 4,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,1))',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.2)',
            }}
          >
            <AutoAwesomeIcon sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
            Automatische Planung für {monthName}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 6.5 }}>
          Dienste, Mitarbeiter und Optionen für diesen Planungslauf
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 4, py: 3, backgroundColor: '#fafafa' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
          <AutoPlanningSection
            icon={<DutiesIcon />}
            title="Zu planende Dienste"
            subtitle="Welche Schichten in diesem Lauf besetzt werden sollen"
          >
            <AutoPlanningDutyScope scope={planScope} onChange={handlePlanScopeChange} />
            {dutyScopeError && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1.5 }}>
                {dutyScopeError}
              </Typography>
            )}
          </AutoPlanningSection>

          <AutoPlanningSection
            icon={<PeopleIcon />}
            title="Mitarbeiter für Planung"
            subtitle={`${includedCount} von ${totalPlanable} ausgewählt · RB/AW-Vorgaben werden gespeichert`}
          >
            <AutoPlanningEmployeeTable
              employees={employees}
              employeeCapacities={employeeCapacities}
              preferences={employeePrefsMap}
              onPreferencesChange={handleEmployeePrefsChange}
            />
            {employeeError && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1.5 }}>
                {employeeError}
              </Typography>
            )}
          </AutoPlanningSection>

          <AutoPlanningSection
            icon={<HistoryIcon />}
            title="Bestehende Zuweisungen"
            subtitle="Wie mit bereits geplanten Schichten umgegangen wird"
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 1.25,
              }}
            >
              <AutoPlanningOptionCard
                icon={<OverwriteIcon />}
                title="Überschreiben"
                description="Alle Positionen neu planen, bestehende Zuweisungen ersetzen"
                selected={settings.existingAssignmentsHandling === 'overwrite'}
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    existingAssignmentsHandling: 'overwrite',
                  }))
                }
              />
              <AutoPlanningOptionCard
                icon={<RespectIcon />}
                title="Berücksichtigen"
                description="Bestehende Zuweisungen behalten und nicht verändern"
                selected={settings.existingAssignmentsHandling === 'respect'}
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    existingAssignmentsHandling: 'respect',
                  }))
                }
              />
            </Box>
          </AutoPlanningSection>

          <AutoPlanningSection icon={<OverplanningIcon />} title="Weitere Optionen">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
              <AutoPlanningSwitchRow
                icon={<OverplanningIcon />}
                title="Überplanung erlauben"
                description="Mitarbeiter können über die maximale Kapazität hinaus verplant werden"
                checked={settings.allowOverplanning}
                onChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    allowOverplanning: checked,
                  }))
                }
              />
              <Box sx={{ height: '1px', backgroundColor: 'rgba(0, 0, 0, 0.06)' }} />
              <AutoPlanningSwitchRow
                icon={<AplanoIcon />}
                title="Aplano berücksichtigen"
                description="Abwesenheiten und Vormonats-Historie aus Aplano einbeziehen"
                checked={settings.includeAplano}
                onChange={(checked) => setSettings((prev) => ({ ...prev, includeAplano: checked }))}
              />
            </Box>
          </AutoPlanningSection>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 4,
          py: 3,
          pt: 2,
          backgroundColor: 'white',
          borderTop: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Button
          onClick={onReset}
          disabled={isLoading || isResetting || !onReset}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            px: 3,
            py: 1,
            borderRadius: 2,
            color: 'error.main',
            '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.08)' },
            '&:disabled': { color: 'rgba(0, 0, 0, 0.26)' },
          }}
        >
          {isResetting ? 'Zurücksetzen...' : 'Planung zurücksetzen'}
        </Button>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            onClick={onClose}
            disabled={isLoading || isResetting || savePrefsMutation.isPending}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              px: 3,
              py: 1,
              borderRadius: 2,
              color: 'text.secondary',
              '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
            }}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleStart}
            variant="contained"
            disabled={isLoading || isResetting || savePrefsMutation.isPending}
            startIcon={
              isLoading || savePrefsMutation.isPending ? (
                <CircularProgress size={18} sx={{ color: 'white' }} />
              ) : (
                <AutoAwesomeIcon sx={{ fontSize: 18 }} />
              )
            }
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1,
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
              '&:hover': { boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)' },
              '&:disabled': {
                backgroundColor: 'primary.main',
                color: 'white',
                opacity: 0.7,
              },
            }}
          >
            {isLoading || savePrefsMutation.isPending ? 'Planung läuft...' : 'Planung starten'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
