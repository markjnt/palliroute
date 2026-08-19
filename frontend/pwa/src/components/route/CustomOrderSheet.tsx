import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, Button, IconButton, Typography, Chip } from '@mui/material';
import { Done as DoneIcon, Close as CloseIcon } from '@mui/icons-material';
import { Sheet } from 'react-modal-sheet';
import { getColorForVisitType } from '../../utils/mapUtils';
import { useDeferredSheetMount } from '../../hooks/useDeferredSheetMount';
import { useSetCustomOrder } from '../../services/queries/useRoutes';

interface CustomOrderStop {
  id: number;
  patientName: string;
  visitType: string;
}

interface CustomOrderSheetProps {
  open: boolean;
  onClose: () => void;
  stops: CustomOrderStop[];
  routeId: number | null;
}

export const CustomOrderSheet: React.FC<CustomOrderSheetProps> = ({
  open,
  onClose,
  stops,
  routeId,
}) => {
  const { shouldRender, onCloseEnd } = useDeferredSheetMount(open);
  const setCustomOrder = useSetCustomOrder();
  const [draftOrder, setDraftOrder] = useState<number[]>([]);
  const itemRefs = useRef(new Map<number, HTMLDivElement>());
  const pendingTops = useRef<Map<number, number> | null>(null);

  useEffect(() => {
    if (open) {
      setDraftOrder([]);
    }
  }, [open, routeId]);

  const selectedIndex = useMemo(() => {
    const map = new Map<number, number>();
    draftOrder.forEach((id, idx) => map.set(id, idx + 1));
    return map;
  }, [draftOrder]);

  const displayedStops = useMemo(() => {
    const selectedStops = draftOrder
      .map((id) => stops.find((stop) => stop.id === id))
      .filter((stop): stop is CustomOrderStop => Boolean(stop));
    const remaining = stops.filter((stop) => !draftOrder.includes(stop.id));
    return [...selectedStops, ...remaining];
  }, [stops, draftOrder]);

  useLayoutEffect(() => {
    const from = pendingTops.current;
    if (!from) return;
    pendingTops.current = null;

    itemRefs.current.forEach((el, id) => {
      const prevTop = from.get(id);
      if (prevTop == null) return;
      const dy = prevTop - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], {
        duration: 380,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      });
    });
  }, [displayedStops]);

  const handleClickStop = (stopId: number) => {
    const tops = new Map<number, number>();
    itemRefs.current.forEach((el, id) => {
      tops.set(id, el.getBoundingClientRect().top);
    });
    pendingTops.current = tops;
    setDraftOrder((current) => {
      if (current.includes(stopId)) {
        return current.filter((id) => id !== stopId);
      }
      return [...current, stopId];
    });
  };

  const handleReset = () => {
    setDraftOrder([]);
  };

  const handleConfirm = async () => {
    if (routeId == null || draftOrder.length !== stops.length) return;
    try {
      await setCustomOrder.mutateAsync({ routeId, appointmentIds: draftOrder });
      onClose();
    } catch (error) {
      console.error('Failed to save custom order:', error);
    }
  };

  if (!shouldRender) {
    return null;
  }

  const canConfirm = stops.length > 0 && draftOrder.length === stops.length;

  return createPortal(
    <Sheet
      isOpen={open}
      onClose={onClose}
      onCloseEnd={onCloseEnd}
      initialSnap={0}
      snapPoints={[0.87, 0]}
    >
      <Sheet.Container>
        <Sheet.Header>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '8px 0',
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
          <Box sx={{ px: 3, pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1d1d1f', flex: 1 }}>
                Eigene Reihenfolge
              </Typography>
              <IconButton
                onClick={onClose}
                sx={{
                  bgcolor: 'rgba(0, 0, 0, 0.06)',
                  color: '#1d1d1f',
                  flexShrink: 0,
                  width: 48,
                  height: 48,
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.1)' },
                }}
                aria-label="Schließen"
              >
                <CloseIcon />
              </IconButton>
              <IconButton
                onClick={handleConfirm}
                disabled={!canConfirm || setCustomOrder.isPending}
                sx={{
                  bgcolor: canConfirm ? 'primary.main' : 'rgba(0, 0, 0, 0.08)',
                  color: canConfirm ? 'white' : 'rgba(0, 0, 0, 0.28)',
                  flexShrink: 0,
                  width: 48,
                  height: 48,
                  '&:hover': {
                    bgcolor: canConfirm ? 'primary.dark' : 'rgba(0, 0, 0, 0.08)',
                  },
                }}
                aria-label="Speichern"
              >
                <DoneIcon />
              </IconButton>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Tippen Sie alle Stops nacheinander an.
            </Typography>
          </Box>
        </Sheet.Header>
        <Sheet.Content>
          <Sheet.Scroller draggableAt="top">
            <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {displayedStops.map((stop) => {
                const order = selectedIndex.get(stop.id);
                const selected = order != null;
                return (
                  <Box
                    key={stop.id}
                    ref={(el: HTMLDivElement | null) => {
                      if (el) {
                        itemRefs.current.set(stop.id, el);
                      } else {
                        itemRefs.current.delete(stop.id);
                      }
                    }}
                    onClick={() => handleClickStop(stop.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      border: selected ? '2px solid #007AFF' : '1px solid rgba(0, 0, 0, 0.08)',
                      bgcolor: selected ? 'rgba(0, 122, 255, 0.08)' : 'white',
                      cursor: 'pointer',
                      transition:
                        'background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: selected ? '#007AFF' : '#E5E5EA',
                        color: selected ? 'white' : '#8E8E93',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {selected ? order : ''}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {stop.patientName}
                      </Typography>
                    </Box>
                    <Chip
                      label={stop.visitType}
                      size="small"
                      sx={{
                        bgcolor: `${getColorForVisitType(stop.visitType)}15`,
                        color: getColorForVisitType(stop.visitType),
                        fontWeight: 600,
                        height: 20,
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          </Sheet.Scroller>
        </Sheet.Content>
        <Box
          sx={{
            p: 2,
            pb: 'max(16px, env(safe-area-inset-bottom))',
            display: 'flex',
            gap: 1,
            borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            bgcolor: 'white',
            flexShrink: 0,
          }}
        >
          <Button
            variant="outlined"
            onClick={handleReset}
            sx={{ flex: 1, textTransform: 'none', borderRadius: 1.5, fontWeight: 600 }}
          >
            Zurücksetzen
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={!canConfirm || setCustomOrder.isPending}
            sx={{ flex: 1, textTransform: 'none', borderRadius: 1.5, fontWeight: 600 }}
          >
            Speichern
          </Button>
        </Box>
      </Sheet.Container>
    </Sheet>,
    document.body
  );
};

export default CustomOrderSheet;
