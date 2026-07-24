# PWA Stale Refresh Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a once-per-session MUI dialog in the PWA when the last manual data refresh is older than two hours, including a 60s re-check while the app stays open.

**Architecture:** Extract a pure `isRefreshStale` helper (unit-tested). A small `StaleRefreshDialog` component reads `lastUpdateTime` from `useLastUpdateStore`, waits for persist hydration, evaluates on mount/`lastUpdateTime` change and every 60s, and calls `refreshData()` from `useRefresh` on confirm. Mount it from `MainLayout`.

**Tech Stack:** React, MUI Dialog, Zustand persist (`useLastUpdateStore`), existing `useRefresh`, Vitest (frontend workspace).

**Spec:** `docs/superpowers/specs/2026-07-24-pwa-stale-refresh-dialog-design.md`

## Global Constraints

- Threshold: exactly `2 * 60 * 60 * 1000` ms (two hours)
- Interval re-check: 60 seconds
- No dialog when `lastUpdateTime` is null
- Session-only flag (`staleWarningShown`); no persist of “Später”
- No Web Push / OS notifications / backend changes
- German copy as in the spec
- Do not restyle the floating refresh button

---

## File Structure

| File | Responsibility |
|------|----------------|
| `frontend/pwa/src/utils/isRefreshStale.ts` | Pure stale check |
| `frontend/pwa/src/utils/isRefreshStale.test.ts` | Unit tests for threshold / null |
| `frontend/pwa/src/components/refresh/StaleRefreshDialog.tsx` | Dialog + session flag + interval |
| `frontend/pwa/src/components/layout/MainLayout.tsx` | Mount `StaleRefreshDialog` |

No changes to `useRefresh`, `useLastUpdateStore`, or `FloatingRefreshButton`.

---

### Task 1: Pure helper `isRefreshStale` (TDD)

**Files:**
- Create: `frontend/pwa/src/utils/isRefreshStale.ts`
- Create: `frontend/pwa/src/utils/isRefreshStale.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `export const TWO_HOURS_MS = 2 * 60 * 60 * 1000` and `export function isRefreshStale(lastUpdateTime: Date | null, now?: Date): boolean`

- [ ] **Step 1: Write the failing test**

Create `frontend/pwa/src/utils/isRefreshStale.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isRefreshStale, TWO_HOURS_MS } from './isRefreshStale';

describe('isRefreshStale', () => {
  const now = new Date('2026-07-24T16:00:00.000Z');

  it('returns false when lastUpdateTime is null', () => {
    expect(isRefreshStale(null, now)).toBe(false);
  });

  it('returns false when last refresh is exactly two hours ago', () => {
    const last = new Date(now.getTime() - TWO_HOURS_MS);
    expect(isRefreshStale(last, now)).toBe(false);
  });

  it('returns false when last refresh is under two hours ago', () => {
    const last = new Date(now.getTime() - TWO_HOURS_MS + 1);
    expect(isRefreshStale(last, now)).toBe(false);
  });

  it('returns true when last refresh is older than two hours', () => {
    const last = new Date(now.getTime() - TWO_HOURS_MS - 1);
    expect(isRefreshStale(last, now)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `frontend/`:

```bash
npm test -- pwa/src/utils/isRefreshStale.test.ts
```

Expected: FAIL (module not found / `isRefreshStale` not defined).

- [ ] **Step 3: Write minimal implementation**

Create `frontend/pwa/src/utils/isRefreshStale.ts`:

```ts
export const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function isRefreshStale(lastUpdateTime: Date | null, now: Date = new Date()): boolean {
  if (!lastUpdateTime) {
    return false;
  }
  return now.getTime() - lastUpdateTime.getTime() > TWO_HOURS_MS;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- pwa/src/utils/isRefreshStale.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/pwa/src/utils/isRefreshStale.ts frontend/pwa/src/utils/isRefreshStale.test.ts
git commit -m "$(cat <<'EOF'
Add isRefreshStale helper for PWA stale refresh dialog.

EOF
)"
```

---

### Task 2: `StaleRefreshDialog` component

**Files:**
- Create: `frontend/pwa/src/components/refresh/StaleRefreshDialog.tsx`

**Interfaces:**
- Consumes: `isRefreshStale` from `../../utils/isRefreshStale`; `useLastUpdateStore` (`lastUpdateTime`); `useRefresh` (`refreshData`); Zustand `useLastUpdateStore.persist.hasHydrated` / `onFinishHydration`
- Produces: default-export React component `<StaleRefreshDialog />` (no props)

- [ ] **Step 1: Create the component**

Create `frontend/pwa/src/components/refresh/StaleRefreshDialog.tsx`:

```tsx
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
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck -w @palliroute/pwa
```

Expected: exit 0 (or only pre-existing unrelated errors — fix any new errors in this file).

- [ ] **Step 3: Commit**

```bash
git add frontend/pwa/src/components/refresh/StaleRefreshDialog.tsx
git commit -m "$(cat <<'EOF'
Add StaleRefreshDialog for outdated PWA data refresh.

EOF
)"
```

---

### Task 3: Mount dialog in `MainLayout`

**Files:**
- Modify: `frontend/pwa/src/components/layout/MainLayout.tsx`

**Interfaces:**
- Consumes: `StaleRefreshDialog` from `../refresh/StaleRefreshDialog`
- Produces: dialog rendered inside main layout tree

- [ ] **Step 1: Import and render**

In `MainLayout.tsx`, add import:

```tsx
import StaleRefreshDialog from '../refresh/StaleRefreshDialog';
```

Inside the outermost `<Box>` return (sibling to the map area, before closing `</Box>`), add:

```tsx
      <StaleRefreshDialog />
```

Full return should look like:

```tsx
  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <MapView onMapClick={handleSheetClose} />

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
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck -w @palliroute/pwa
```

Expected: exit 0 for changes related to this feature.

- [ ] **Step 3: Manual smoke (optional but recommended)**

Run `npm run dev -w @palliroute/pwa`, then in DevTools console after hydration:

```js
// Force stale lastUpdateTime (persist key: last-update-storage)
useLastUpdateStore = null; // ignore — use localStorage instead:
```

Or via Application → Local Storage → key `last-update-storage`, set JSON like:

```json
{"state":{"lastUpdateTime":"2026-07-24T10:00:00.000Z"},"version":0}
```

Reload the PWA. Expected: dialog appears. “Später” closes it and it does not reopen until full reload. “Jetzt aktualisieren” closes and updates the chip time.

Clear `lastUpdateTime` / remove the key and reload: no dialog.

- [ ] **Step 4: Commit**

```bash
git add frontend/pwa/src/components/layout/MainLayout.tsx
git commit -m "$(cat <<'EOF'
Show stale refresh dialog from PWA MainLayout.

EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Dialog when last refresh > 2h | Task 1 + 2 |
| No dialog if never refreshed | Task 1 + 2 |
| Once per session / Später | Task 2 |
| Jetzt aktualisieren → `refreshData` | Task 2 |
| 60s interval while open | Task 2 |
| Wait for persist hydration | Task 2 |
| Mount in main tour UI | Task 3 |
| No push / no button restyle / no backend | Global constraints (no tasks) |

## Placeholder scan

No TBD/TODO placeholders; signatures and copy are concrete.
