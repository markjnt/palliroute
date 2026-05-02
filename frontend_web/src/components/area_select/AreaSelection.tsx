import React, { useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { mapFloatingControlSx } from '../../theme/floatingControlSx';
import { useNavigate } from 'react-router-dom';
import { useAreaStore } from '../../stores/useAreaStore';
import AreaList from './AreaList';
import { Public as PublicIcon, ChangeCircle as ChangeIcon, Close as CloseIcon } from '@mui/icons-material';

const AREAS = ['Nord- und Südkreis', 'Nordkreis', 'Südkreis'];

const getAreaInitial = (area: string) => {
    if (area === 'Nordkreis') return 'N';
    if (area === 'Südkreis') return 'S';
    if (area === 'Nord- und Südkreis' || area === 'Gesamt') return 'G';
    return '?';
};

interface AreaSelectionProps {
    compact?: boolean;
    onAreaChange?: () => void;
    /** Dialog von außen steuern (z. B. Karten-Menü) */
    dialogOpen?: boolean;
    onDialogOpenChange?: (open: boolean) => void;
    /** Kompakt-Button ausblenden — Dialog nur über `dialogOpen` */
    hideCompactButton?: boolean;
}

const AreaSelection: React.FC<AreaSelectionProps> = ({
    compact = false,
    onAreaChange,
    dialogOpen: controlledDialogOpen,
    onDialogOpenChange,
    hideCompactButton = false,
}) => {
    const { currentArea, setCurrentArea } = useAreaStore();
    const navigate = useNavigate();
    const [internalModalOpen, setInternalModalOpen] = useState(false);

    const isDialogControlled =
        controlledDialogOpen !== undefined && onDialogOpenChange !== undefined;
    const modalOpen = isDialogControlled ? controlledDialogOpen : internalModalOpen;
    const setModalOpen = (open: boolean) => {
        if (isDialogControlled) onDialogOpenChange!(open);
        else setInternalModalOpen(open);
    };

    const handleAreaSelect = (area: string) => {
        setCurrentArea(area);
        if (compact) {
            setModalOpen(false);
            onAreaChange?.();
        } else {
            navigate('/');
        }
    };

    const handleButtonClick = () => {
        if (compact) {
            setModalOpen(true);
        }
    };

    // Kompakte Version für die Karte
    if (compact) {
        return (
            <>
                {!hideCompactButton && (
                    <Button
                        onClick={handleButtonClick}
                        variant="outlined"
                        size="small"
                        startIcon={<ChangeIcon />}
                        sx={mapFloatingControlSx}
                    >
                        {getAreaInitial(currentArea || '')}
                    </Button>
                )}

                <Dialog
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            maxWidth: 400,
                        },
                    }}
                >
                    <DialogTitle
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            pb: 2,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                            <Box
                                sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 2,
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <ChangeIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography component="span" variant="h6" sx={{ lineHeight: 1.3 }}>
                                    Gebiet wählen
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                    Kreis für Karte und Planung
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton
                            aria-label="Schließen"
                            onClick={() => setModalOpen(false)}
                            size="small"
                            sx={{ color: 'text.secondary' }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ p: 0 }}>
                        <Box sx={{ px: 2.5, pt: 3, pb: 3 }}>
                            <AreaList
                                areas={AREAS}
                                onAreaSelect={handleAreaSelect}
                                selectedArea={currentArea}
                            />
                        </Box>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    // Vollständige Version für die Seite
    return (
        <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
            <Box
                sx={{
                    p: 4,
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 1,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <PublicIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                    </Box>
                    <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        Kreisauswahl
                    </Typography>
                </Box>
                <AreaList
                    areas={AREAS}
                    onAreaSelect={handleAreaSelect}
                    selectedArea={currentArea}
                />
            </Box>
        </Container>
    );
};

export default AreaSelection;
