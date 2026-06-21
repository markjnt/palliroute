export const getCurrentCalendarWeek = (): number => {
    const now = new Date();
    const date = new Date(now.getTime());
    const dayOfWeek = (date.getDay() + 6) % 7 + 1;
    date.setDate(date.getDate() + 4 - dayOfWeek);
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNumber;
};

export const getBestCalendarWeek = (availableWeeks: number[]): number => {
    if (availableWeeks.length === 0) {
        throw new Error('No calendar weeks available');
    }
    const currentWeek = getCurrentCalendarWeek();
    return availableWeeks.includes(currentWeek)
        ? currentWeek
        : Math.max(...availableWeeks);
};
