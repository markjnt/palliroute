import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { MapView } from "./MainViewMap";
import { useUserStore } from "../../stores/useUserStore";
import { useWeekdayStore } from "../../stores/useWeekdayStore";
import { MainBottomSheet } from "./MainBottomSheet";
import AdditionalRoutesSheet from "../user/AdditionalRoutesSheet";
import AdminEmployeeSelectSheet from "../user/AdminEmployeeSelectSheet";
import { TopOverviewBar } from "./TopOverviewBar";
import { useAuthMe } from "../../services/queries/useAuthMe";
import { useFallbackSelectedWeekday } from "../../hooks/useFallbackSelectedWeekday";

declare global {
  interface Window {
    __closeWeekdaySelector?: () => void;
  }
}

const WEEKDAY_STORAGE_KEY = "pwa-weekday-storage";

const MainLayout: React.FC = () => {
  const { selectedUserId } = useUserStore();
  const { resetToCurrentDay } = useWeekdayStore();
  const { data: me } = useAuthMe();
  const [isAdditionalRoutesOpen, setIsAdditionalRoutesOpen] = useState(false);
  const [isAdminSelectOpen, setIsAdminSelectOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const isAdmin = Boolean(me?.is_admin);
  useFallbackSelectedWeekday();

  useEffect(() => {
    const applyCurrentDay = () => {
      if (!selectedUserId) {
        return;
      }

      const isNewSession = sessionStorage.getItem(WEEKDAY_STORAGE_KEY) === null;
      if (isNewSession) {
        resetToCurrentDay();
      }
    };

    if (useUserStore.persist.hasHydrated()) {
      applyCurrentDay();
      return;
    }

    return useUserStore.persist.onFinishHydration(applyCurrentDay);
  }, [selectedUserId, resetToCurrentDay]);

  useEffect(() => {
    if (isAdmin && !selectedUserId) {
      setIsAdminSelectOpen(true);
    }
  }, [isAdmin, selectedUserId]);

  const handleUserSwitch = () => {
    const nextOpen = !isAdditionalRoutesOpen;
    if (nextOpen) {
      setIsSheetOpen(false);
    }
    setIsAdditionalRoutesOpen(nextOpen);
  };

  const handleDrawerClose = () => {
    setIsAdditionalRoutesOpen(false);
  };

  const handleSheetToggle = () => {
    if (!isSheetOpen) {
      setIsAdditionalRoutesOpen(false);
    }
    setIsSheetOpen(!isSheetOpen);
  };

  const handleSheetClose = () => {
    setIsSheetOpen(false);
    setIsAdditionalRoutesOpen(false);
    window.__closeWeekdaySelector?.();
  };

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <Box sx={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <MapView onMapClick={handleSheetClose} />

        <TopOverviewBar
          onUserSwitch={handleUserSwitch}
          onSheetToggle={handleSheetToggle}
          onCloseWeekdaySelector={() => {}}
          onWeekdayButtonClick={() => {
            setIsSheetOpen(false);
            setIsAdditionalRoutesOpen(false);
          }}
        />

        <MainBottomSheet isOpen={isSheetOpen} onClose={handleSheetClose} />

        <AdditionalRoutesSheet
          open={isAdditionalRoutesOpen}
          onClose={handleDrawerClose}
        />
        <AdminEmployeeSelectSheet
          open={isAdminSelectOpen}
          onClose={() => {
            if (!useUserStore.getState().selectedUserId && isAdmin) {
              setIsAdminSelectOpen(true);
              return;
            }
            setIsAdminSelectOpen(false);
          }}
        />
      </Box>
    </Box>
  );
};

export default MainLayout;
