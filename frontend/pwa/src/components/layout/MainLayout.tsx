import React, { useEffect, useState, useRef } from 'react';
import { Box, SwipeableDrawer, Button, Menu, MenuItem, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { MapView } from './MainViewMap';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { MainBottomSheet } from './MainBottomSheet';
import UserSearchDrawer from '../user/UserSelectSheet';
import { TopOverviewBar } from './TopOverviewBar';
import StaleRefreshDialog from '../refresh/StaleRefreshDialog';

const WEEKDAY_STORAGE_KEY = 'pwa-weekday-storage';

const MainLayout: React.FC = () => {
  const { selectedUserId, selectedTourArea } = useUserStore();
  const { resetToCurrentDay, resetToCurrentAreaDay } = useWeekdayStore();
  const navigate = useNavigate();
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const previousTourTypeRef = useRef<'employee' | 'tour_area' | null>(null);

  // Aktuellen Tag setzen, sobald der User-Store geladen ist (neue Session oder Tour-Wechsel)
  useEffect(() => {
    const applyCurrentDay = () => {
      const currentTourType: 'employee' | 'tour_area' | null = selectedTourArea
        ? 'tour_area'
        : selectedUserId
          ? 'employee'
          : null;

      if (!currentTourType) {
        return;
      }

      const isTourTypeChange =
        previousTourTypeRef.current !== null && previousTourTypeRef.current !== currentTourType;
      const isNewSession = sessionStorage.getItem(WEEKDAY_STORAGE_KEY) === null;

      if (isNewSession || isTourTypeChange) {
        if (currentTourType === 'tour_area') {
          resetToCurrentAreaDay();
        } else {
          resetToCurrentDay();
        }
      }

      previousTourTypeRef.current = currentTourType;
    };

    if (useUserStore.persist.hasHydrated()) {
      applyCurrentDay();
      return;
    }

    return useUserStore.persist.onFinishHydration(applyCurrentDay);
  }, [selectedUserId, selectedTourArea, resetToCurrentDay, resetToCurrentAreaDay]);

  // Redirect to user selection if no user is selected
  useEffect(() => {
    if (!selectedUserId) {
      setIsUserDrawerOpen(true);
    }
  }, [selectedUserId]);

  const handleUserSwitch = () => {
    const nextIsUserDrawerOpen = !isUserDrawerOpen;

    // Wenn der User-Selector geöffnet wird, MainBottomSheet schließen
    if (nextIsUserDrawerOpen) {
      setIsSheetOpen(false);
    }

    setIsUserDrawerOpen(nextIsUserDrawerOpen);
  };

  const handleDrawerClose = () => {
    setIsUserDrawerOpen(false);
  };

  const handleSheetToggle = () => {
    if (!isSheetOpen) {
      setIsUserDrawerOpen(false); // User-Sheet schließen beim Öffnen des MainBottomSheet
    }
    setIsSheetOpen(!isSheetOpen);
  };

  const handleSheetClose = () => {
    setIsSheetOpen(false);
    setIsUserDrawerOpen(false); // Also close user select sheet when map/outside is clicked
    // Also close weekday selector when map is clicked
    if ((window as any).__closeWeekdaySelector) {
      (window as any).__closeWeekdaySelector();
    }
  };

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed', // Fix position to prevent viewport issues
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <MapView onMapClick={handleSheetClose} />

        {/* Top Overview Bar */}
        <TopOverviewBar
          onUserSwitch={handleUserSwitch}
          onSheetToggle={handleSheetToggle}
          onCloseWeekdaySelector={() => {}}
          onWeekdayButtonClick={() => {
            setIsSheetOpen(false);
            setIsUserDrawerOpen(false);
          }}
        />

        <MainBottomSheet isOpen={isSheetOpen} onClose={handleSheetClose} />

        <UserSearchDrawer open={isUserDrawerOpen} onClose={handleDrawerClose} />
      </Box>

      <StaleRefreshDialog />
    </Box>
  );
};

export default MainLayout;
