import type { FirstDayOfWeek } from '../constants';

export interface HeatmapTheme {
  accent: string;
  colors: string[];
}

export interface DayColorInput {
  date: Date;
  dateKey: string;
  now: Date;
  theme: HeatmapTheme;
  luckyMode: boolean;
  customDayColors?: Record<string, string>;
}

export const FULL_MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const ABBR_MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const getFirstDayIndex = (firstDayOfWeek: FirstDayOfWeek, locale = navigator.language) => {
  if (firstDayOfWeek === 'sunday') return 0;
  if (firstDayOfWeek === 'monday') return 1;

  try {
    if (Intl && (Intl as any).Locale) {
      const intlLocale = new (Intl as any).Locale(locale);
      if (intlLocale.weekInfo && intlLocale.weekInfo.firstDay !== undefined) {
        const firstDay = intlLocale.weekInfo.firstDay;
        return firstDay === 7 ? 0 : firstDay;
      }
    }
  } catch (e) {}

  return /en-US/i.test(locale) ? 0 : 1;
};

export const getStartDayOffset = (date: Date, firstDayOfWeek: FirstDayOfWeek, locale = navigator.language) =>
  (date.getDay() - getFirstDayIndex(firstDayOfWeek, locale) + 7) % 7;

export const getDateKey = (year: number, monthIndex: number, day: number) =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const seededUnit = (seed: number) => Math.abs(Math.sin(seed) * 10000) % 1;

export const getPastDayColor = (theme: HeatmapTheme, luckyMode: boolean, seed: number) => {
  const unit = seededUnit(seed);
  if (luckyMode) return `hsl(${Math.floor(unit * 360)}, 80%, 65%)`;

  const safeColors = theme?.colors || ['#34D399', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B'];
  return safeColors[Math.floor(unit * 4) + 2] || safeColors[safeColors.length - 1];
};

export const getDayColor = ({ date, dateKey, now, theme, luckyMode, customDayColors }: DayColorInput) => {
  if (customDayColors && customDayColors[dateKey]) return customDayColors[dateKey];
  if (date.toDateString() === now.toDateString()) return theme?.accent || '#34D399';
  if (date < now) return getPastDayColor(theme, luckyMode, date.getTime());
  return 'rgba(255,255,255,0.15)';
};

export const getCountdownDayColor = (dayIndex: number, passedDays: number, isActiveDay: boolean, startTime: number, theme: HeatmapTheme, luckyMode: boolean) => {
  if (isActiveDay) return theme?.accent || '#34D399';
  if (dayIndex < passedDays) return getPastDayColor(theme, luckyMode, dayIndex + startTime);
  return 'rgba(255,255,255,0.15)';
};

export const parseLocalDateTime = (date: string, time = '00:00') => {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
};
