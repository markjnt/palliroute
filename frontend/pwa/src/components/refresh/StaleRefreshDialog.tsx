import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { useLastUpdateStore } from '../../stores/useLastUpdateStore';
import { useRefresh } from '../../services/queries/useRefresh';
import { isRefreshStale } from '../../utils/isRefreshStale';

const CHECK_INTERVAL_MS = 60_000;

export const StaleRefreshDialog: React.FC = () => {
  const { lastUpdateTime } = useLastUpdateStore();
  const { refreshData } = useRefresh();
  const [hydrated, setHydrated] = useState(() => useLastUpdateStore.persist.hasHydrated());
  const [open, setOpen] = useState(false);
  const [staleWarningShown, setStaleWarningShown] = useState(false);

  useEffect(() => {
    if (useLastUpdateStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useLastUpdateStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
  }, []);

  const evaluate = useCallback(() => {
    if (!hydrated || staleWarningShown) {
      return;
    }
    if (isRefreshStale(lastUpdateTime)) {
      setOpen(true);
      setStaleWarningShown(true);
    }
  }, [hydrated, lastUpdateTime, staleWarningShown]);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  useEffect(() => {
    if (!hydrated || staleWarningShown) {
      return;
    }
    const id = window.setInterval(evaluate, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [hydrated, staleWarningShown, evaluate]);

  const handleLater = () => {
    setOpen(false);
  };

  const handleRefreshNow = () => {
    setOpen(false);
    refreshData();
  };

  return (
    <Dialog open={open} onClose={handleLater}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        Daten möglicherweise veraltet
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Der letzte manuelle Daten-Refresh liegt mehr als zwei Stunden zurück. Möchten Sie jetzt
          aktualisieren?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleLater}>Später</Button>
        <Button variant="contained" color="primary" onClick={handleRefreshNow} autoFocus>
          Jetzt aktualisieren
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StaleRefreshDialog;
