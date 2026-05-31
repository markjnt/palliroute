import React from 'react';
import { 
    Box, 
    Button, 
    Tooltip 
} from '@mui/material';
import { 
    Route as RouteIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

interface OptimizeState {
    isOptimizing: boolean;
}

interface TourControlsProps {
    expanded: boolean;
    optimizeState: OptimizeState;
    tourPatientsCount: number;
    routeId?: number;
    isVisible: boolean;
    onOptimizeRoute: () => void;
    onToggleVisibility: () => void;
}

export const TourControls: React.FC<TourControlsProps> = ({
    expanded,
    optimizeState,
    tourPatientsCount,
    routeId,
    isVisible,
    onOptimizeRoute,
    onToggleVisibility
}) => {
    if (!expanded) return null;

    const controlHoverSx = {
        '&:hover': {
            backgroundColor: 'primary.light',
            color: 'primary.contrastText',
        },
    } as const;

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mt: 0.5,
                mb: 2,
            }}
        >
            <Button
                variant="outlined"
                size="small"
                startIcon={<RouteIcon />}
                onClick={onOptimizeRoute}
                disabled={optimizeState.isOptimizing || tourPatientsCount === 0}
                sx={{
                    height: 40,
                    ...controlHoverSx,
                }}
            >
                {optimizeState.isOptimizing ? 'Optimiert...' : 'Optimieren'}
            </Button>

            {routeId !== undefined && (
                <Tooltip title={isVisible ? 'Route ausblenden' : 'Route einblenden'} arrow>
                    <span>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={onToggleVisibility}
                            sx={{
                                minWidth: 40,
                                width: 40,
                                height: 40,
                                p: 0,
                                ...controlHoverSx,
                            }}
                        >
                            {isVisible ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                        </Button>
                    </span>
                </Tooltip>
            )}
        </Box>
    );
};
