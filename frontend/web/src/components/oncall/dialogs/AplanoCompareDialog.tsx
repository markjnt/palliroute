import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  CheckCircleOutline as CheckCircleOutlineIcon,
  Close as CloseIcon,
  ErrorOutline as ErrorOutlineIcon,
  Healing as NursingIcon,
  LocalHospital as DoctorIcon,
  Nightlight as NightIcon,
  Refresh as RefreshIcon,
  WarningAmber as WarningAmberIcon,
  WbSunny as DayIcon,
  Weekend as AWIcon,
} from '@mui/icons-material';
import { AplanoCompareEntry, AplanoCompareResponse } from '../../../services/api/scheduling';
import { WEEKDAY_DUTIES, WEEKEND_DUTIES } from '../../../utils/oncall/constants';
import { getDutyColor } from '../../../utils/oncall/colorUtils';
import { DutyType, OnCallArea } from '../../../types/models';

type StatusFilter = 'all' | 'equal' | 'missing_in_aplano' | 'different';

interface AplanoCompareDialogProps {
  open: boolean;
  onClose: () => void;
  monthLabel: string;
  compareData?: AplanoCompareResponse;
  isLoading: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

const statusLabel: Record<Exclude<StatusFilter, 'all'>, string> = {
  equal: 'Gleich',
  missing_in_aplano: 'Fehlt in Aplano',
  different: 'Abweichend',
};

function getStatusChipSx(status: Exclude<StatusFilter, 'all'>) {
  if (status === 'equal') {
    return {
      height: 28,
      borderRadius: 2,
      fontWeight: 700,
      fontSize: '0.75rem',
      border: '1px solid',
      borderColor: 'success.light',
      backgroundColor: 'rgba(76,175,80,0.14)',
      color: 'success.dark',
      '& .MuiChip-label': { px: 1.25 },
    } as const;
  }
  if (status === 'missing_in_aplano') {
    return {
      height: 28,
      borderRadius: 2,
      fontWeight: 700,
      fontSize: '0.75rem',
      border: '1px solid',
      borderColor: 'warning.light',
      backgroundColor: 'rgba(255,167,38,0.2)',
      color: 'warning.dark',
      '& .MuiChip-label': { px: 1.25 },
    } as const;
  }
  return {
    height: 28,
    borderRadius: 2,
    fontWeight: 700,
    fontSize: '0.75rem',
    border: '1px solid',
    borderColor: 'error.light',
    backgroundColor: 'rgba(239,83,80,0.16)',
    color: 'error.dark',
    '& .MuiChip-label': { px: 1.25 },
  } as const;
}

const categoryMap: Record<string, string> = {
  RB_WEEKDAY: 'RB Werktag',
  RB_WEEKEND: 'RB Wochenende',
  AW: 'AW',
};
const roleMap: Record<string, string> = {
  NURSING: 'Pflege',
  DOCTOR: 'Ärztlich',
};
const timeMap: Record<string, string> = {
  DAY: 'Tag',
  NIGHT: 'Nacht',
  NONE: 'Ganztägig',
};

function formatDateGerman(dateIso: string): string {
  const d = new Date(dateIso);
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getDutyTypeForRow(row: AplanoCompareEntry): DutyType | null {
  if (row.category === 'AW' && row.role === 'NURSING') return 'aw_nursing';
  if (row.category === 'RB_WEEKDAY' && row.role === 'NURSING') return 'rb_nursing_weekday';
  if (row.category === 'RB_WEEKDAY' && row.role === 'DOCTOR') return 'rb_doctors_weekday';
  if (row.category === 'RB_WEEKEND' && row.role === 'DOCTOR') return 'rb_doctors_weekend';
  if (row.category === 'RB_WEEKEND' && row.role === 'NURSING' && row.time_of_day === 'DAY') return 'rb_nursing_weekend_day';
  if (row.category === 'RB_WEEKEND' && row.role === 'NURSING' && row.time_of_day === 'NIGHT') return 'rb_nursing_weekend_night';
  return null;
}

function getDutyLabelForRow(row: AplanoCompareEntry): string {
  const dutyType = getDutyTypeForRow(row);
  const area = row.area as OnCallArea;
  if (!dutyType) return `${categoryMap[row.category] ?? row.category} ${row.area}`;
  const source = dutyType.includes('weekend') || dutyType.includes('aw_') ? WEEKEND_DUTIES : WEEKDAY_DUTIES;
  const match = source.find((d) => d.type === dutyType && d.area === area);
  return match?.shortLabel ?? `${categoryMap[row.category] ?? row.category} ${row.area}`;
}

function getDutyIconForRow(row: AplanoCompareEntry) {
  const dutyType = getDutyTypeForRow(row);
  if (!dutyType) return <NursingIcon sx={{ fontSize: 16 }} />;
  if (dutyType === 'aw_nursing') return <AWIcon sx={{ fontSize: 16 }} />;
  if (dutyType.includes('doctors')) return <DoctorIcon sx={{ fontSize: 16 }} />;
  if (dutyType.includes('weekend_day')) return <DayIcon sx={{ fontSize: 16 }} />;
  if (dutyType.includes('weekend_night')) return <NightIcon sx={{ fontSize: 16 }} />;
  return <NursingIcon sx={{ fontSize: 16 }} />;
}

function humanizeReason(reason?: string | null): string | null {
  if (!reason) return null;
  const labels: Record<string, string> = {
    missing_in_aplano: 'In PalliRoute vorhanden, in Aplano fehlt der Eintrag.',
    missing_internal_assignment: 'In Aplano vorhanden, intern fehlt die Zuordnung.',
    employee_mismatch: 'Mitarbeiter zwischen PalliRoute und Aplano unterschiedlich.',
    multiple_aplano_assignments: 'Mehrere Aplano-Einträge für denselben Slot gefunden.',
  };
  return labels[reason] ?? reason;
}

export const AplanoCompareDialog: React.FC<AplanoCompareDialogProps> = ({
  open,
  onClose,
  monthLabel,
  compareData,
  isLoading,
  isRefreshing = false,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<StatusFilter>('all');

  const rows = compareData?.details ?? [];
  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((row) => row.status === filter);
  }, [rows, filter]);
  const groupedRows = useMemo(() => {
    const map = new Map<string, AplanoCompareEntry[]>();
    filteredRows
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((row) => {
        if (!map.has(row.date)) map.set(row.date, []);
        map.get(row.date)!.push(row);
      });
    return Array.from(map.entries());
  }, [filteredRows]);

  const summary = compareData?.summary;
  const hasError = compareData?.error === 'APLANO_UNAVAILABLE';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        },
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          pt: 2.5,
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Aplano-Abgleich
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Vergleich für {monthLabel}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'text.secondary',
              mt: -0.25,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          pt: 3,
          pb: 2.5,
        }}
      >
        {isLoading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : hasError ? (
          <Alert severity="error">Aplano ist momentan nicht verfügbar.</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5, pt: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, mb: 1 }}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2.5,
                  borderColor: 'success.light',
                  backgroundColor: 'background.paper',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <CheckCircleOutlineIcon color="success" sx={{ fontSize: 16 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Gleich
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1 }}>
                      {summary?.equal_count ?? 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2.5,
                  borderColor: 'warning.light',
                  backgroundColor: 'background.paper',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <WarningAmberIcon color="warning" sx={{ fontSize: 16 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Fehlt in Aplano
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1 }}>
                      {summary?.missing_in_aplano_count ?? 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2.5,
                  borderColor: 'error.light',
                  backgroundColor: 'background.paper',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <ErrorOutlineIcon color="error" sx={{ fontSize: 16 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Abweichend
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1 }}>
                      {summary?.different_count ?? 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={filter}
                onChange={(_, next) => next && setFilter(next)}
                sx={{
                  backgroundColor: 'rgba(0,0,0,0.03)',
                  borderRadius: 2.5,
                  p: 0.5,
                  '& .MuiToggleButton-root': {
                    border: 'none',
                    borderRadius: 2,
                    px: 1.25,
                    py: 0.75,
                    textTransform: 'none',
                    fontWeight: 600,
                  },
                }}
              >
                <ToggleButton value="all">Alle</ToggleButton>
                <ToggleButton value="equal">Gleich</ToggleButton>
                <ToggleButton value="missing_in_aplano">Fehlt in Aplano</ToggleButton>
                <ToggleButton value="different">Abweichend</ToggleButton>
              </ToggleButtonGroup>

              <Box sx={{ ml: 'auto' }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
                  onClick={onRefresh}
                  disabled={!onRefresh || isRefreshing}
                >
                  Aktualisieren
                </Button>
              </Box>
            </Box>

            <Box sx={{ maxHeight: 460, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {filteredRows.length === 0 ? (
                <Alert severity="info">Keine Einträge für den gewählten Filter.</Alert>
              ) : (
                groupedRows.map(([date, dayRows]) => (
                  <Box key={date} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        px: 0.25,
                      }}
                    >
                      {formatDateGerman(date)}
                    </Typography>
                    {dayRows.map((row, idx) => {
                      const dutyType = getDutyTypeForRow(row);
                      const dutyColor = dutyType ? getDutyColor(dutyType, row.area as OnCallArea, true) : '#e0e0e0';
                      return (
                        <Box
                          key={`${row.date}-${row.category}-${row.role}-${row.time_of_day}-${idx}`}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2.5,
                            p: 1.25,
                            transition: 'all 0.2s ease',
                            backgroundColor: 'background.paper',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              boxShadow: '0 6px 14px rgba(0,0,0,0.08)',
                              borderColor: 'primary.light',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', mb: 1 }}>
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.75,
                                px: 1,
                                py: 0.5,
                                borderRadius: 2,
                                backgroundColor: dutyColor,
                              }}
                            >
                              {getDutyIconForRow(row)}
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                {getDutyLabelForRow(row)}
                              </Typography>
                            </Box>
                            <Chip
                              label={statusLabel[row.status as Exclude<StatusFilter, 'all'>]}
                              size="small"
                              sx={getStatusChipSx(row.status as Exclude<StatusFilter, 'all'>)}
                            />
                          </Box>

                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 1,
                            }}
                          >
                            <Box sx={{ p: 1, borderRadius: 2, backgroundColor: 'rgba(25,118,210,0.06)' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                                PalliRoute
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {row.employee_internal?.name ?? '—'}
                              </Typography>
                            </Box>
                            <Box sx={{ p: 1, borderRadius: 2, backgroundColor: 'rgba(2,136,209,0.08)' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                                Aplano
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {row.employee_aplano?.name ?? '—'}
                              </Typography>
                            </Box>
                          </Box>

                          {row.reason && (
                            <Box sx={{ mt: 1 }}>
                              <Alert severity="info" sx={{ py: 0, borderRadius: 2 }}>
                                <Typography variant="caption">Hinweis: {humanizeReason(row.reason)}</Typography>
                              </Alert>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                ))
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
