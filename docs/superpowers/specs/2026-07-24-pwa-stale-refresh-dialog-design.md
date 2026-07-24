# PWA Stale Refresh Dialog

## Problem

In the PWA, tour data does not auto-refresh (`staleTime: Infinity`, no refetch on focus). Users must tap the floating refresh button. It is easy to keep working with data that is hours old. The UI already shows the last refresh time on a chip, but there is no active prompt when that time is too old.

## Goal

Show a one-time-per-session dialog when the last manual refresh is older than two hours, with an option to refresh immediately. Also re-check periodically while the app stays open so the dialog still appears if the threshold is crossed mid-session.

## Non-goals

- Web Push / OS notifications
- Visual warning styling on the refresh button/chip
- Persisting “Later” across app restarts
- Warning when the user has never refreshed (`lastUpdateTime` is null)
- Backend or API changes

## Behavior

| Condition | Result |
|-----------|--------|
| `lastUpdateTime` is null | No dialog |
| `now - lastUpdateTime` ≤ 2 hours | No dialog |
| `now - lastUpdateTime` > 2 hours and warning not yet shown this session | Show dialog |
| User taps “Später” | Close dialog; do not show again this session |
| User taps “Jetzt aktualisieren” | Close dialog, call `refreshData()`, do not show again this session |
| App left open and threshold crossed later | Dialog can still appear (periodic check), once per session |

Session flag: in-memory `staleWarningShown` (resets on full page reload / new app open).

## UI

MUI `Dialog` (aligned with the web TourSidebar stale-import dialog):

- **Title:** Daten möglicherweise veraltet (with warning icon)
- **Body:** Der letzte manuelle Daten-Refresh liegt mehr als zwei Stunden zurück. Möchten Sie jetzt aktualisieren?
- **Actions:**
  - Später — dismiss
  - Jetzt aktualisieren — primary; calls existing `refreshData()` from `useRefresh`

## Placement

- New component, e.g. `frontend/pwa/src/components/refresh/StaleRefreshDialog.tsx`
- Mounted from `MainLayout` so it is available whenever the main tour UI is shown
- Uses `useLastUpdateStore` for `lastUpdateTime` and `useRefresh` for `refreshData`

## Logic

1. On mount and whenever `lastUpdateTime` changes: evaluate stale condition.
2. Interval every **60 seconds**: re-evaluate if `staleWarningShown` is still false.
3. Stale if `lastUpdateTime != null` and `Date.now() - lastUpdateTime.getTime() > 2 * 60 * 60 * 1000`.
4. Wait for Zustand persist hydration of `last-update-storage` before the first check (avoid false “never refreshed” / wrong date during rehydrate).

## Testing (manual)

- Refresh, then set/mock time or temporarily lower threshold: dialog appears after threshold.
- “Später”: dialog gone, no second show until reload.
- “Jetzt aktualisieren”: data invalidates, `lastUpdateTime` updates, dialog closed.
- Never refreshed: no dialog.
- Leave app open across threshold: dialog appears within ~60s after crossing.
