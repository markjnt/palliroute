/** ISO week number (1–53) for a local date. */
export const getCalendarWeek = (now: Date = new Date()): number => {
  const date = new Date(now.getTime());
  const dayOfWeek = ((date.getDay() + 6) % 7) + 1;
  date.setDate(date.getDate() + 4 - dayOfWeek);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

export const getCurrentCalendarWeek = (): number => getCalendarWeek(new Date());

/** ISO week-year (the year that contains the Thursday of this week). */
export const getIsoWeekYear = (now: Date = new Date()): number => {
  const date = new Date(now.getTime());
  const dayOfWeek = ((date.getDay() + 6) % 7) + 1;
  date.setDate(date.getDate() + 4 - dayOfWeek);
  return date.getFullYear();
};

/**
 * ISO week-year for a calendar-week number relative to `now`.
 * Available KWs are stored without a year, so KW 1 in late December belongs
 * to the next ISO year and KW 52/53 in January to the previous one.
 */
export const isoYearForCalendarWeek = (
  week: number,
  now: Date = new Date(),
): number => {
  const currentWeek = getCalendarWeek(now);
  const year = getIsoWeekYear(now);
  if (week >= 45 && currentWeek <= 15) return year - 1;
  if (week <= 15 && currentWeek >= 45) return year + 1;
  return year;
};

export const getBestCalendarWeek = (availableWeeks: number[]): number => {
  if (availableWeeks.length === 0) {
    throw new Error("No calendar weeks available");
  }
  const currentWeek = getCurrentCalendarWeek();
  return availableWeeks.includes(currentWeek)
    ? currentWeek
    : Math.max(...availableWeeks);
};
