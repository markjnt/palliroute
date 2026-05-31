import React from 'react';
import { Box, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';

interface AreaListProps {
    areas: string[];
    onAreaSelect: (area: string) => void;
    selectedArea?: string | null;
}

const getAreaChipColor = (area: string) => {
    if (area === 'Nordkreis') return 'primary';
    if (area === 'Südkreis') return 'secondary';
    if (area === 'Nord- und Südkreis' || area === 'Gesamt') return 'default';
    return 'default';
};

const rowBackground = (theme: Theme, isSelected: boolean, areaColor: string) => {
    if (!isSelected) {
        return theme.palette.mode === 'light' ? theme.palette.grey[50] : theme.palette.grey[900];
    }
    if (areaColor === 'primary') {
        return alpha(theme.palette.primary.main, 0.1);
    }
    if (areaColor === 'secondary') {
        return alpha(theme.palette.secondary.main, 0.1);
    }
    return alpha(theme.palette.text.primary, 0.06);
};

const rowBorder = (theme: Theme, isSelected: boolean, areaColor: string) => {
    if (!isSelected) {
        return theme.palette.divider;
    }
    if (areaColor === 'primary') {
        return theme.palette.primary.main;
    }
    if (areaColor === 'secondary') {
        return theme.palette.secondary.main;
    }
    return theme.palette.divider;
};

const AreaList: React.FC<AreaListProps> = ({ areas, onAreaSelect, selectedArea }) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'stretch' }}>
            {areas.map((area) => {
                const isSelected = selectedArea === area;
                const areaColor = getAreaChipColor(area);
                const displayText = area === 'Nord- und Südkreis' ? 'Gesamt' : area;
                const areaInitial = area === 'Nordkreis' ? 'N' : area === 'Südkreis' ? 'S' : 'G';

                return (
                    <Box
                        key={area}
                        onClick={() => onAreaSelect(area)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onAreaSelect(area);
                            }
                        }}
                        sx={(theme) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: 2,
                            borderRadius: 2,
                            backgroundColor: rowBackground(theme, isSelected, areaColor),
                            border: '1px solid',
                            borderColor: rowBorder(theme, isSelected, areaColor),
                            cursor: 'pointer',
                            transition: theme.transitions.create(
                                ['background-color', 'border-color', 'box-shadow'],
                                { duration: theme.transitions.duration.shortest },
                            ),
                            '&:hover': {
                                backgroundColor: isSelected
                                    ? rowBackground(theme, true, areaColor)
                                    : theme.palette.action.hover,
                                borderColor: isSelected
                                    ? rowBorder(theme, true, areaColor)
                                    : theme.palette.divider,
                                boxShadow: isSelected ? theme.shadows[2] : theme.shadows[1],
                            },
                            '&:focus-visible': {
                                outline: `2px solid ${theme.palette.primary.main}`,
                                outlineOffset: 2,
                            },
                        })}
                    >
                        <Box
                            sx={(theme) => ({
                                width: 44,
                                height: 44,
                                borderRadius: 2,
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 600,
                                fontSize: '1.1rem',
                                transition: theme.transitions.create(['background-color', 'color'], {
                                    duration: theme.transitions.duration.shortest,
                                }),
                                ...(isSelected && areaColor === 'primary'
                                    ? {
                                          bgcolor: 'primary.main',
                                          color: 'primary.contrastText',
                                      }
                                    : isSelected && areaColor === 'secondary'
                                      ? {
                                            bgcolor: 'secondary.main',
                                            color: 'secondary.contrastText',
                                        }
                                      : isSelected
                                        ? {
                                              bgcolor: 'text.primary',
                                              color: 'background.paper',
                                          }
                                        : areaColor === 'primary'
                                          ? {
                                                bgcolor: alpha(theme.palette.primary.main, 0.12),
                                                color: 'primary.main',
                                            }
                                          : areaColor === 'secondary'
                                            ? {
                                                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                                                  color: 'secondary.main',
                                              }
                                            : {
                                                  bgcolor: alpha(theme.palette.text.primary, 0.08),
                                                  color: 'text.primary',
                                              }),
                            })}
                        >
                            {areaInitial}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                                sx={{
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: 'text.primary',
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                {displayText}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                {area === 'Nord- und Südkreis'
                                    ? 'Gesamter Bereich'
                                    : area === 'Nordkreis'
                                      ? 'Nördlicher Bereich'
                                      : 'Südlicher Bereich'}
                            </Typography>
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
};

export default AreaList;
