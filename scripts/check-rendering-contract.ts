import { readFileSync } from 'fs';
import path from 'path';
import {
  getCountdownDayColor,
  getDateKey,
  getDayColor,
  getStartDayOffset,
  seededUnit,
} from '../src/rendering/wallpaperPlan';

const root = path.resolve(import.meta.dirname, '..');
const workerSource = readFileSync(path.join(root, 'android/app/src/main/java/com/yishin/sisyphus/WallpaperWorker.java'), 'utf-8');

const assertEqual = <T>(actual: T, expected: T, label: string) => {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
};

const assertSourceContains = (pattern: string, label: string) => {
  if (!workerSource.includes(pattern)) {
    throw new Error(`WallpaperWorker contract missing: ${label}`);
  }
};

const theme = {
  accent: '#8AAEE0',
  colors: ['#0B1221', '#172746', '#213969', '#2F5FAF', '#6289CD', '#8AAEE0'],
};

assertEqual(getDateKey(2026, 0, 9), '2026-01-09', 'date key format');
assertEqual(getStartDayOffset(new Date(2026, 0, 1), 'monday', 'zh-CN'), 3, 'Monday week offset');
assertEqual(getStartDayOffset(new Date(2026, 0, 1), 'sunday', 'en-US'), 4, 'Sunday week offset');
assertEqual(Number(seededUnit(1704067200000).toFixed(6)), 0.055825, 'seeded random unit');
assertEqual(
  getDayColor({
    date: new Date(2026, 0, 8),
    dateKey: '2026-01-08',
    now: new Date(2026, 0, 10),
    theme,
    luckyMode: false,
    customDayColors: {},
  }),
  '#8AAEE0',
  'past day palette color'
);
assertEqual(
  getDayColor({
    date: new Date(2026, 0, 9),
    dateKey: '2026-01-09',
    now: new Date(2026, 0, 10),
    theme,
    luckyMode: false,
    customDayColors: { '2026-01-09': '#D9656B' },
  }),
  '#D9656B',
  'custom day color precedence'
);
assertEqual(
  getCountdownDayColor(2, 3, false, 1704067200000, theme, false),
  '#8AAEE0',
  'countdown past day color'
);

[
  ['getFirstDayIndex(', 'first-day-of-week helper'],
  ['getStartDayOffset(', 'week offset helper'],
  ['dateKey(', 'date key helper'],
  ['seededUnit(', 'seeded color helper'],
  ['safePastColor(', 'past color helper'],
  ['parseCustomDayColors(', 'custom day colors'],
  ['drawMergedYearlyHeatmap(', 'merged yearly renderer'],
  ['drawCountdownHeatmap(', 'countdown renderer'],
  ['settingsUpdatedAt', 'stale worker guard'],
].forEach(([pattern, label]) => assertSourceContains(pattern, label));

console.log('Rendering contract checks passed.');
