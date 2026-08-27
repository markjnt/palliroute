import { Sheet, SheetRef } from "react-modal-sheet";
import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { RouteInfo } from "../route/RouteInfo";
import { RouteList } from "../route/RouteList";
import { useAdditionalRoutesStore } from "../../stores/useAdditionalRoutesStore";
import { useUserStore } from "../../stores/useUserStore";
import { useDeferredSheetMount } from "../../hooks/useDeferredSheetMount";

interface MainBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export type MainBottomSheetRef = Record<string, never>;

export const MainBottomSheet = forwardRef<
  MainBottomSheetRef,
  MainBottomSheetProps
>(({ isOpen, onClose }, ref) => {
  const sheetRef = useRef<SheetRef>(null);
  const { shouldRender: shouldRenderSheet, onCloseEnd } =
    useDeferredSheetMount(isOpen);
  const { resetForNewUser } = useAdditionalRoutesStore();
  const { selectedUserId } = useUserStore();

  const snapPoints = [0.85, 0];

  // Reset additional routes when logged-in user or tour area changes
  useEffect(() => {
    resetForNewUser();
  }, [selectedUserId, resetForNewUser]);

  // No imperative methods needed for simple open/close behavior
  useImperativeHandle(ref, () => ({}), []);

  if (!shouldRenderSheet) {
    return null;
  }

  return (
    <>
      <Sheet
        ref={sheetRef}
        isOpen={isOpen}
        onClose={onClose}
        onCloseEnd={onCloseEnd}
        initialSnap={0}
        snapPoints={snapPoints}
      >
        <Sheet.Container>
          <Sheet.Header>
            {/* Drag handle */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "8px 0",
                cursor: "grab",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "4px",
                  backgroundColor: "rgba(0, 0, 0, 0.2)",
                  borderRadius: "8px",
                }}
              />
            </div>
            <RouteInfo />
          </Sheet.Header>
          <Sheet.Content>
            <Sheet.Scroller draggableAt="top">
              <div style={{ paddingBottom: 24 }}>
                <RouteList onShowAdditionalRoute={onClose} />
              </div>
            </Sheet.Scroller>
          </Sheet.Content>
        </Sheet.Container>
      </Sheet>
    </>
  );
});
