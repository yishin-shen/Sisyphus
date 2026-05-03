export type ShapeType = 'square' | 'circle' | 'vertical-pill' | 'rounded-square';

export const THEMES = [
  {
    id: 'capri-blue',
    name: { en: 'Capri Blue', zh: '卡布里蓝' },
    bg: '#0B1221',
    accent: '#8AAEE0',
    colors: ['#0B1221', '#172746', '#213969', '#2F5FAF', '#6289CD', '#8AAEE0']
  },
  {
    id: 'cinnabar-red',
    name: { en: 'Cinnabar Red', zh: '赤霞红' },
    bg: '#240709',
    accent: '#D9656B',
    colors: ['#240709', '#480F13', '#79191F', '#B3262E', '#C6565C', '#D9656B']
  },
  {
    id: 'brilliant-magenta',
    name: { en: 'Brilliant Magenta', zh: '璀璨洋红' },
    bg: '#260411',
    accent: '#E05B8F',
    colors: ['#260411', '#530A26', '#8A113E', '#C2185B', '#D1487B', '#E05B8F']
  },
  {
    id: 'flowing-gold-pink',
    name: { en: 'Dawn Pink', zh: '流金粉' },
    bg: '#2B2120',
    accent: '#F2D5D1',
    colors: ['#2B2120', '#564240', '#8D6C68', '#D8A7A0', '#E5BFB9', '#F2D5D1']
  },
  {
    id: 'radiant-purple',
    name: { en: 'Rosy Dawn Purple', zh: '霞光紫' },
    bg: '#181221',
    accent: '#B19CD1',
    colors: ['#181221', '#302442', '#553F75', '#7A5CA8', '#9981BF', '#B19CD1']
  },
  {
    id: 'mineral-gray',
    name: { en: 'Elegant Gray', zh: '雅灰' },
    bg: '#151617',
    accent: '#A6A9AD',
    colors: ['#151617', '#2A2C2F', '#4A4D53', '#6B6F76', '#888B91', '#A6A9AD']
  },
  {
    id: 'pearl-white',
    name: { en: 'Pearl White', zh: '珍珠白' },
    bg: '#1A1A19',
    accent: '#F5F5F3',
    colors: ['#1A1A19', '#3D3D3A', '#7A7A75', '#B8B8B5', '#D6D6D4', '#F5F5F3']
  },
  {
    id: 'obsidian-black',
    name: { en: 'Obsidian Black', zh: '曜石黑' },
    bg: '#050506',
    accent: '#5E5E6B',
    colors: ['#050506', '#09090B', '#0D0D0F', '#212126', '#36363E', '#5E5E6B']
  },
  {
    id: 'indigo-stone-green',
    name: { en: 'Indigo Stone Green', zh: '靛石绿' },
    bg: '#09120F',
    accent: '#77A398',
    colors: ['#09120F', '#12241F', '#204037', '#2E5B4F', '#527F73', '#77A398']
  }
];

export type ViewType = 'year' | 'merged';
export type AppMode = 'push' | 'down';
export type MonthLabelType = 'full' | 'abbr' | 'none';
export type IconSize = 'compact' | 'loose';
export type Language = 'en' | 'zh';
export type LifeValueMode = 'birthdate' | 'custom';
export type FirstDayOfWeek = 'sunday' | 'monday' | 'auto';

export interface AppSettings {
  appMode: AppMode;
  countdownStart: string;
  countdownStartTime: string;
  countdownEnd: string;
  countdownEndTime: string;
  bgExposure: number;
  percentSize: number;
  percentDecimals: number;
  percentOffsetY: number;
  refreshInterval: number;
  viewType: ViewType;
  themeId: string;
  birthDate: string;
  lifeValueMode: LifeValueMode;
  customLifeValue: number;
  monthLabelType: MonthLabelType;
  monthFont: string;
  firstDayOfWeek: FirstDayOfWeek;
  gridCols: 3 | 4;
  shapeType: ShapeType;
  iconSize: IconSize;
  resWidth: number;
  resHeight: number;
  language: Language;
  customTheme?: {
    bg: string;
    accent: string;
    colors: string[];
  };
  bgImage?: string;
  offsetY: number;
  customDayColors: Record<string, string>;
  customBottomText: string;
  luckyMode: boolean; // Random vibrant colors for past dates
  autoUpdateEnabled: boolean;
}

export const TRANSLATIONS = {
  en: {
    title: 'Sisyphus',
    subtitle: 'Material You Edition',
    previewLabel: 'Adaptive Wallpaper Preview',
    exportBtn: 'Export Wallpaper',
    tabs: {
      grid: 'Grid',
      color: 'Color',
      text: 'Text',
      setup: 'Setup'
    },
    modes: {
      push: 'PUSH',
      down: 'DOWN'
    },
    countdown: {
      start: 'Start Date',
      end: 'Target Date'
    },
    down: {
      exposure: 'Background Darken',
      percentSize: 'Percentage Size',
      decimals: 'Decimal Places',
      offsetY: 'Percentage Vertical Position'
    },
    grid: {
      cols: 'Grid Columns',
      mode: 'Visualization Mode',
      year: 'Separated',
      yearDesc: '12-month separated blocks',
      merged: 'Merged',
      mergedDesc: 'Compact continuous grid',
      firstDay: 'First Day of Week',
      weekdays: {
        sunday: 'Sunday',
        monday: 'Monday'
      },
      shape: 'Shape',
      size: 'Size'
    },
    color: {
      palette: 'Material Palette',
      custom: 'Custom Theme',
      extract: 'Extract from Image',
      primary: 'Primary Color',
      secondary: 'Secondary',
      tertiary: 'Tertiary',
      luckyMode: 'Lucky Mode (Random Colors)'
    },
    text: { sizes: { compact: 'Compact', loose: 'Loose' }, labelStyle: 'Months', labelDesc: 'Select month label display format', labelFont: 'Font', bottomText: 'Bottom Title', bottomTextPlaceholder: 'e.g. 🪨' },
    setup: {
      resolution: 'Screen Resolution',
      language: 'Language',
      customDayColor: 'Highlight Special Days',
      autoUpdate: 'Daily Auto Update',
      autoUpdateDesc: 'Automatically refresh wallpaper',
      refreshInterval: 'Refresh Interval',
      hour1: '1 Hour',
      hour6: '6 Hours',
      hour12: '12 Hours',
      daily: 'Daily',
      bgImage: 'Background Image',
      version: 'Version',
      github: 'GitHub Repository'
    }
  },
  zh: {
    title: 'Sisyphus',
    subtitle: 'Material You 风格',
    previewLabel: '自适应壁纸预览',
    exportBtn: '导出壁纸',
    tabs: {
      grid: '布局',
      color: '颜色',
      text: '文字标签',
      setup: '设置'
    },
    modes: {
      push: '推石',
      down: '荒诞'
    },
    countdown: {
      start: '起始日期',
      end: '目标日期'
    },
    down: {
      exposure: '背景曝光降低',
      percentSize: '百分比文字大小',
      decimals: '保留小数位数',
      offsetY: '百分比垂直位置'
    },
    grid: {
      cols: '网格列数',
      mode: '可视化模式',
      year: '分离式',
      yearDesc: '12个月独立网格',
      merged: '融合式',
      mergedDesc: '紧凑网格拼接',
      firstDay: '每周第一天',
      weekdays: {
        sunday: '周日',
        monday: '周一'
      },
      shape: '图形形状',
      size: '图形间距'
    },
    color: {
      palette: '动态配色',
      custom: '自定义主题',
      extract: '从图片取色',
      primary: '主色调',
      secondary: '次色',
      tertiary: '三色',
      dynamic: '从系统获取动态配色',
      luckyMode: '幸运模式 (多彩随机颜色)'
    },
    text: { sizes: { compact: '紧凑', loose: '宽松' }, labelStyle: '月份样式', labelDesc: '选择热力图上方月份的显示格式', labelFont: '字体选择', bottomText: '底部标题文字', bottomTextPlaceholder: '例如：🪨' },
    setup: {
      resolution: '屏幕分辨率',
      language: '语言',
      customDayColor: '特殊日子自定义颜色',
      autoUpdate: '后台自动更新',
      autoUpdateDesc: '按照设定间隔在后台更新壁纸',
      refreshInterval: '更新间隔',
      hour1: '1小时',
      hour6: '6小时',
      hour12: '12小时',
      daily: '每天',
      bgImage: '壁纸底图',
      version: '版本',
      github: '开源地址'
    }
  }
};

export const FONTS = [
  { name: 'JetBrains Mono', family: '"JetBrains Mono", monospace' },
  { name: 'Share Tech Mono', family: '"Share Tech Mono", monospace' },
  { name: 'Inter', family: '"Inter", sans-serif' },
  { name: 'DotGothic16', family: '"DotGothic16", sans-serif' }
];

export const RESOLUTIONS = [
  { label: '1080 x 1920 (9:16)', width: 1080, height: 1920 },
  { label: '1080 x 2400 (9:20)', width: 1080, height: 2400 },
  { label: '1440 x 3120 (9:19.5)', width: 1440, height: 3120 },
  { label: 'Custom', width: 0, height: 0 }
];
