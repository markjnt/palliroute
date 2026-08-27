import React, { useMemo } from 'react';
import { Box, Typography, Chip, ButtonBase } from '@mui/material';
import {
  LocalHospital as DoctorIcon,
  Healing as NursingIcon,
  Weekend as AWIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { AutoPlanScope } from '../../../services/api/scheduling';
import { getDutyColor } from '../../../utils/oncall/colorUtils';
import { DutyType, OnCallArea } from '../../../types/models';

type ScopeKey = keyof AutoPlanScope;

interface DutyOption {
  key: ScopeKey;
  label: string;
  area: OnCallArea;
  dutyType: DutyType;
  icon: React.ReactNode;
  group: 'rb' | 'aw';
}

const RB_OPTIONS: DutyOption[] = [
  {
    key: 'rb_nursing_nord',
    label: 'Nord Pflege',
    area: 'Nord',
    dutyType: 'rb_nursing_weekday',
    icon: <NursingIcon sx={{ fontSize: 16 }} />,
    group: 'rb',
  },
  {
    key: 'rb_doctors_nord',
    label: 'Nord Ärzte',
    area: 'Nord',
    dutyType: 'rb_doctors_weekday',
    icon: <DoctorIcon sx={{ fontSize: 16 }} />,
    group: 'rb',
  },
  {
    key: 'rb_nursing_sued',
    label: 'Süd Pflege',
    area: 'Süd',
    dutyType: 'rb_nursing_weekday',
    icon: <NursingIcon sx={{ fontSize: 16 }} />,
    group: 'rb',
  },
  {
    key: 'rb_doctors_sued',
    label: 'Süd Ärzte',
    area: 'Süd',
    dutyType: 'rb_doctors_weekday',
    icon: <DoctorIcon sx={{ fontSize: 16 }} />,
    group: 'rb',
  },
];

const AW_OPTIONS: DutyOption[] = [
  {
    key: 'aw_nord',
    label: 'Nord',
    area: 'Nord',
    dutyType: 'aw_nursing',
    icon: <AWIcon sx={{ fontSize: 16 }} />,
    group: 'aw',
  },
  {
    key: 'aw_mitte',
    label: 'Mitte',
    area: 'Mitte',
    dutyType: 'aw_nursing',
    icon: <AWIcon sx={{ fontSize: 16 }} />,
    group: 'aw',
  },
  {
    key: 'aw_sued',
    label: 'Süd',
    area: 'Süd',
    dutyType: 'aw_nursing',
    icon: <AWIcon sx={{ fontSize: 16 }} />,
    group: 'aw',
  },
];

interface AutoPlanningDutyScopeProps {
  scope: AutoPlanScope;
  onChange: (scope: AutoPlanScope) => void;
}

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClear: () => void;
}> = ({ icon, title, selectedCount, totalCount, onSelectAll, onClear }) => {
  const allSelected = selectedCount === totalCount;
  const noneSelected = selectedCount === 0;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        mb: 1.25,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            color: 'text.secondary',
            '& svg': { fontSize: 16 },
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.2 }}
          >
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            {selectedCount} von {totalCount} ausgewählt
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Chip
          label="Alle"
          size="small"
          clickable
          onClick={onSelectAll}
          disabled={allSelected}
          sx={{
            height: 24,
            fontSize: '0.7rem',
            fontWeight: 500,
            opacity: allSelected ? 0.5 : 1,
          }}
        />
        <Chip
          label="Keine"
          size="small"
          clickable
          variant="outlined"
          onClick={onClear}
          disabled={noneSelected}
          sx={{
            height: 24,
            fontSize: '0.7rem',
            fontWeight: 500,
            opacity: noneSelected ? 0.5 : 1,
          }}
        />
      </Box>
    </Box>
  );
};

const DutyToggle: React.FC<{
  option: DutyOption;
  selected: boolean;
  onToggle: () => void;
}> = ({ option, selected, onToggle }) => {
  const color = getDutyColor(option.dutyType, option.area, true);
  const pale = getDutyColor(option.dutyType, option.area, false);

  return (
    <ButtonBase
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`${option.label} ${selected ? 'ausgewählt' : 'nicht ausgewählt'}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.25,
        py: 1,
        borderRadius: 2,
        border: '1.5px solid',
        borderColor: selected ? color : 'rgba(0, 0, 0, 0.08)',
        backgroundColor: selected ? color : pale,
        transition: 'all 0.15s ease',
        textAlign: 'left',
        width: '100%',
        opacity: selected ? 1 : 0.72,
        boxShadow: selected ? `0 1px 4px ${color}55` : 'none',
        '&:hover': {
          opacity: 1,
          transform: 'translateY(-1px)',
          boxShadow: `0 2px 8px ${color}40`,
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
      }}
    >
      <Box
        sx={{
          width: 22,
          height: 22,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.7)',
          color: 'text.primary',
          flexShrink: 0,
        }}
      >
        {selected ? <CheckIcon sx={{ fontSize: 14 }} /> : option.icon}
      </Box>
      <Typography
        variant="body2"
        sx={{
          fontWeight: selected ? 600 : 500,
          fontSize: '0.8rem',
          color: 'text.primary',
          lineHeight: 1.2,
        }}
      >
        {option.label}
      </Typography>
    </ButtonBase>
  );
};

export const AutoPlanningDutyScope: React.FC<AutoPlanningDutyScopeProps> = ({
  scope,
  onChange,
}) => {
  const rbSelectedCount = useMemo(() => RB_OPTIONS.filter((o) => scope[o.key]).length, [scope]);
  const awSelectedCount = useMemo(() => AW_OPTIONS.filter((o) => scope[o.key]).length, [scope]);

  const toggle = (key: ScopeKey) => {
    onChange({ ...scope, [key]: !scope[key] });
  };

  const setGroup = (keys: ScopeKey[], value: boolean) => {
    const next = { ...scope };
    for (const key of keys) next[key] = value;
    onChange(next);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box>
        <SectionHeader
          icon={<NursingIcon />}
          title="Rufbereitschaft"
          selectedCount={rbSelectedCount}
          totalCount={RB_OPTIONS.length}
          onSelectAll={() =>
            setGroup(
              RB_OPTIONS.map((o) => o.key),
              true
            )
          }
          onClear={() =>
            setGroup(
              RB_OPTIONS.map((o) => o.key),
              false
            )
          }
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr' },
            gap: 1,
          }}
        >
          {RB_OPTIONS.map((option) => (
            <DutyToggle
              key={option.key}
              option={option}
              selected={scope[option.key]}
              onToggle={() => toggle(option.key)}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ height: '1px', backgroundColor: 'rgba(0, 0, 0, 0.06)' }} />

      <Box>
        <SectionHeader
          icon={<AWIcon />}
          title="Arbeitswochenende"
          selectedCount={awSelectedCount}
          totalCount={AW_OPTIONS.length}
          onSelectAll={() =>
            setGroup(
              AW_OPTIONS.map((o) => o.key),
              true
            )
          }
          onClear={() =>
            setGroup(
              AW_OPTIONS.map((o) => o.key),
              false
            )
          }
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
            gap: 1,
          }}
        >
          {AW_OPTIONS.map((option) => (
            <DutyToggle
              key={option.key}
              option={option}
              selected={scope[option.key]}
              onToggle={() => toggle(option.key)}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};
