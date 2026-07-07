import React, { useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { employeeTypeColors } from '@palliroute/shared';
import { Employee, EmployeeCapacity } from '../../../types/models';
import {
  EmployeePlanningPreference,
  DutyPreference,
  AwRhythm,
  StoredEmployeePlanningPreference,
} from '../../../services/api/scheduling';

type EmployeeFilter = 'all' | 'pflege_n' | 'pflege_s' | 'arzt';

const isNursing = (employee: Employee) =>
  employee.function === 'Pflegekraft' || employee.function === 'PDL';

const isDoctor = (employee: Employee) =>
  employee.function === 'Arzt' || employee.function === 'Honorararzt';

const isPlanableRole = (employee: Employee) => isNursing(employee) || isDoctor(employee);

const getTotalCapacity = (employeeId: number, capacities: EmployeeCapacity[]) =>
  capacities
    .filter((c) => c.employee_id === employeeId)
    .reduce((sum, c) => sum + (c.max_count ?? 0), 0);

export const createDefaultEmployeePreferences = (
  employees: Employee[],
  capacities: EmployeeCapacity[],
  saved?: StoredEmployeePlanningPreference[]
): Record<number, EmployeePlanningPreference> => {
  const savedMap = new Map((saved ?? []).map((s) => [s.employee_id, s]));
  const prefs: Record<number, EmployeePlanningPreference> = {};
  for (const emp of employees) {
    if (!emp.id || !isPlanableRole(emp)) continue;
    const hasCapacity = getTotalCapacity(emp.id, capacities) > 0;
    const stored = savedMap.get(emp.id);
    prefs[emp.id] = {
      employee_id: emp.id,
      included: hasCapacity,
      rb_even_weeks: stored?.rb_even_weeks ?? true,
      rb_odd_weeks: stored?.rb_odd_weeks ?? true,
      duty_preference: stored?.duty_preference ?? 'neutral',
      aw_rhythm: stored?.aw_rhythm ?? 'regular',
    };
  }
  return prefs;
};

export const toStoredPreferences = (
  prefs: Record<number, EmployeePlanningPreference>
): StoredEmployeePlanningPreference[] =>
  Object.values(prefs).map(({ employee_id, rb_even_weeks, rb_odd_weeks, duty_preference, aw_rhythm }) => ({
    employee_id,
    rb_even_weeks,
    rb_odd_weeks,
    duty_preference,
    aw_rhythm,
  }));

interface AutoPlanningEmployeeTableProps {
  employees: Employee[];
  employeeCapacities: EmployeeCapacity[];
  preferences: Record<number, EmployeePlanningPreference>;
  onPreferencesChange: (prefs: Record<number, EmployeePlanningPreference>) => void;
}

export const AutoPlanningEmployeeTable: React.FC<AutoPlanningEmployeeTableProps> = ({
  employees,
  employeeCapacities,
  preferences,
  onPreferencesChange,
}) => {
  const [employeeFilter, setEmployeeFilter] = React.useState<EmployeeFilter>('all');

  const planableEmployees = useMemo(
    () => employees.filter((e) => e.id && isPlanableRole(e)),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    let base = planableEmployees;
    if (employeeFilter === 'pflege_n') {
      base = base.filter((e) => isNursing(e) && e.area?.includes('Nordkreis'));
    } else if (employeeFilter === 'pflege_s') {
      base = base.filter((e) => isNursing(e) && e.area?.includes('Südkreis'));
    } else if (employeeFilter === 'arzt') {
      base = base.filter((e) => isDoctor(e));
    }
    return base;
  }, [planableEmployees, employeeFilter]);

  const sortedEmployees = useMemo(() => {
    const functionPriority: Record<string, number> = {
      Pflegekraft: 1,
      PDL: 2,
      Arzt: 3,
      Honorararzt: 4,
    };
    return [...filteredEmployees].sort((a, b) => {
      const aPriority = functionPriority[a.function] ?? 999;
      const bPriority = functionPriority[b.function] ?? 999;
      if (aPriority !== bPriority) return aPriority - bPriority;
      const getAreaOrder = (area?: string) => {
        if (!area) return 2;
        if (area.includes('Nordkreis')) return 0;
        if (area.includes('Südkreis')) return 1;
        return 2;
      };
      const areaOrderA = getAreaOrder(a.area);
      const areaOrderB = getAreaOrder(b.area);
      if (areaOrderA !== areaOrderB) return areaOrderA - areaOrderB;
      return `${a.last_name} ${a.first_name}`
        .toLowerCase()
        .localeCompare(`${b.last_name} ${b.first_name}`.toLowerCase());
    });
  }, [filteredEmployees]);

  const updatePreference = useCallback(
    (employeeId: number, patch: Partial<EmployeePlanningPreference>) => {
      const current = preferences[employeeId];
      if (!current) return;
      onPreferencesChange({
        ...preferences,
        [employeeId]: { ...current, ...patch },
      });
    },
    [preferences, onPreferencesChange]
  );

  const visibleIds = sortedEmployees.map((e) => e.id!).filter(Boolean);
  const allVisibleIncluded =
    visibleIds.length > 0 && visibleIds.every((id) => preferences[id]?.included);
  const someVisibleIncluded = visibleIds.some((id) => preferences[id]?.included);

  const handleToggleAllVisible = () => {
    const nextIncluded = !allVisibleIncluded;
    const next = { ...preferences };
    for (const id of visibleIds) {
      if (next[id]) next[id] = { ...next[id], included: nextIncluded };
    }
    onPreferencesChange(next);
  };

  const getAreaLabel = (area?: string) => {
    if (!area) return null;
    if (area.includes('Nordkreis')) return 'N';
    if (area.includes('Südkreis')) return 'S';
    return null;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
        {(
          [
            { key: 'all', label: 'Alle' },
            { key: 'pflege_n', label: 'Pflege N' },
            { key: 'pflege_s', label: 'Pflege S' },
            { key: 'arzt', label: 'Ärzte' },
          ] as const
        ).map(({ key, label }) => (
          <Chip
            key={key}
            label={label}
            size="small"
            clickable
            color={employeeFilter === key ? 'primary' : 'default'}
            variant={employeeFilter === key ? 'filled' : 'outlined'}
            onClick={() => setEmployeeFilter(key)}
            sx={{ fontSize: '0.7rem', height: 24 }}
          />
        ))}
      </Box>

      <TableContainer
        sx={{
          maxHeight: 320,
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.06)',
          borderRadius: 2,
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ backgroundColor: 'grey.50' }}>
                <Checkbox
                  size="small"
                  checked={allVisibleIncluded}
                  indeterminate={someVisibleIncluded && !allVisibleIncluded}
                  onChange={handleToggleAllVisible}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600, backgroundColor: 'grey.50', minWidth: 160 }}>
                Mitarbeiter
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: 'grey.50', minWidth: 90 }}>
                RB gerade
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: 'grey.50', minWidth: 90 }}>
                RB ungerade
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: 'grey.50', minWidth: 180 }}>
                Bevorzugt
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: 'grey.50', minWidth: 110 }}>
                AW-Rhythmus
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  Keine Mitarbeiter für diesen Filter
                </TableCell>
              </TableRow>
            ) : (
              sortedEmployees.map((employee) => {
                const empId = employee.id!;
                const pref = preferences[empId];
                if (!pref) return null;
                const doctor = isDoctor(employee);
                const areaLabel = getAreaLabel(employee.area);
                const funcColor =
                  employeeTypeColors[employee.function] || employeeTypeColors.default;

                return (
                  <TableRow key={empId} hover selected={pref.included}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={pref.included}
                        onChange={(e) =>
                          updatePreference(empId, { included: e.target.checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                          {employee.last_name}, {employee.first_name}
                        </Typography>
                        {areaLabel && (
                          <Chip
                            label={areaLabel}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              backgroundColor: 'transparent',
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          />
                        )}
                        <Chip
                          label={employee.function}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            backgroundColor: `${funcColor}18`,
                            color: funcColor,
                            border: `1px solid ${funcColor}40`,
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        size="small"
                        checked={pref.rb_even_weeks}
                        disabled={!pref.included}
                        onChange={(e) =>
                          updatePreference(empId, { rb_even_weeks: e.target.checked })
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        size="small"
                        checked={pref.rb_odd_weeks}
                        disabled={!pref.included}
                        onChange={(e) =>
                          updatePreference(empId, { rb_odd_weeks: e.target.checked })
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      {doctor ? (
                        <Typography variant="caption" color="text.disabled">
                          —
                        </Typography>
                      ) : (
                        <ToggleButtonGroup
                          size="small"
                          exclusive
                          value={pref.duty_preference}
                          disabled={!pref.included}
                          onChange={(_, value: DutyPreference | null) => {
                            if (value) updatePreference(empId, { duty_preference: value });
                          }}
                          sx={{
                            '& .MuiToggleButton-root': {
                              textTransform: 'none',
                              fontSize: '0.7rem',
                              px: 1,
                              py: 0.25,
                            },
                          }}
                        >
                          <ToggleButton value="neutral">Neutral</ToggleButton>
                          <ToggleButton value="aw">AW</ToggleButton>
                          <ToggleButton value="rb">RB</ToggleButton>
                        </ToggleButtonGroup>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {doctor ? (
                        <Typography variant="caption" color="text.disabled">
                          —
                        </Typography>
                      ) : (
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0.25,
                          }}
                        >
                          <Switch
                            size="small"
                            checked={pref.aw_rhythm === 'regular'}
                            disabled={!pref.included}
                            onChange={(e) =>
                              updatePreference(empId, {
                                aw_rhythm: (e.target.checked ? 'regular' : 'irregular') as AwRhythm,
                              })
                            }
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            {pref.aw_rhythm === 'regular' ? 'Regelmäßig' : 'Unregelmäßig'}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
