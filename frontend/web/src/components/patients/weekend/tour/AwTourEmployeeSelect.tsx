import React, { useMemo } from 'react';
import { Autocomplete, TextField, Box, Typography } from '@mui/material';
import { Employee, Route } from '../../../../types/models';

interface AwTourEmployeeSelectProps {
  route?: Route;
  employees: Employee[];
  disabled?: boolean;
  isAssigning?: boolean;
  onAssign: (employeeId: number | null) => void;
  /** Clear / X: reset to current Aplano assignee (not empty). */
  onResetToAplano: () => void;
}

const FUNCTION_PRIORITY: Record<string, number> = {
  Pflegekraft: 1,
  PDL: 2,
  Physiotherapie: 3,
  Arzt: 4,
  Honorararzt: 5,
};

export const AwTourEmployeeSelect: React.FC<AwTourEmployeeSelectProps> = ({
  route,
  employees,
  disabled = false,
  isAssigning = false,
  onAssign,
  onResetToAplano,
}) => {
  const sortedEmployees = useMemo(() => {
    return [...employees]
      .filter((emp) => emp.id != null)
      .sort((a, b) => {
        const aPriority = FUNCTION_PRIORITY[a.function] || 999;
        const bPriority = FUNCTION_PRIORITY[b.function] || 999;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        return `${a.last_name} ${a.first_name}`.localeCompare(
          `${b.last_name} ${b.first_name}`,
          'de'
        );
      });
  }, [employees]);

  const selectedEmployee = sortedEmployees.find((emp) => emp.id === route?.employee_id) ?? null;
  const isOverride = Boolean(route?.employee_override);

  return (
    <Autocomplete
      fullWidth
      size="small"
      options={sortedEmployees}
      value={selectedEmployee}
      onChange={(_, value) => {
        if (value == null) {
          onResetToAplano();
          return;
        }
        onAssign(value.id ?? null);
      }}
      getOptionLabel={(emp) => `${emp.first_name} ${emp.last_name}`}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      disabled={disabled || !route?.id || isAssigning}
      clearOnEscape
      noOptionsText="Kein Mitarbeiter gefunden"
      filterOptions={(options, { inputValue }) => {
        const query = inputValue.trim().toLowerCase();
        if (!query) return options;
        return options.filter((emp) => {
          const name = `${emp.first_name} ${emp.last_name}`.toLowerCase();
          return (
            name.includes(query) ||
            (emp.function || '').toLowerCase().includes(query) ||
            (emp.area || '').toLowerCase().includes(query)
          );
        });
      }}
      renderOption={(props, emp) => {
        const { key, ...optionProps } = props;
        const isAplanoSuggestion = emp.id === route?.aplano_employee_id;
        return (
          <Box component="li" key={key} {...optionProps}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2">
                {emp.first_name} {emp.last_name}
                {isAplanoSuggestion ? ' · Aplano' : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {[emp.function, emp.area].filter(Boolean).join(' · ')}
              </Typography>
            </Box>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField {...params} label="Mitarbeiter" placeholder="Suchen…" />
      )}
      sx={{
        flex: 1,
        minWidth: 0,
        width: '100%',
        '& .MuiOutlinedInput-root': isOverride
          ? {
              bgcolor: 'warning.50',
              '& fieldset': { borderColor: 'warning.main' },
            }
          : undefined,
      }}
    />
  );
};
