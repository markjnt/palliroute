export const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function isRefreshStale(lastUpdateTime: Date | null, now: Date = new Date()): boolean {
  if (!lastUpdateTime) {
    return false;
  }
  return now.getTime() - lastUpdateTime.getTime() > TWO_HOURS_MS;
}
