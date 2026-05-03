import { registerPlugin } from '@capacitor/core';

export interface WallpaperPlugin {
  getScreenResolution(): Promise<{ width: number; height: number }>;
  setLockScreenWallpaper(options: {
    imageBase64: string,
    settings?: {
      bg: string,
      accent: string,
      colors: string,
      appMode: string,
      viewType: string,
      firstDayOfWeek: string,
      monthLabelType: string,
      countdownStart: string,
      countdownStartTime: string,
      countdownEnd: string,
      countdownEndTime: string,
      bgExposure: number,
      percentSize: number,
      percentDecimals: number,
      refreshInterval: number,
      gridCols: number,
      offsetY: number,
      luckyMode: boolean,
      customBottomText: string,
      iconSize: string,
      shapeType: string,
      autoUpdateEnabled: boolean,
      customDayColors?: Record<string, string>
    }
  }): Promise<{ success: boolean }>;
  saveToGallery(options: { imageBase64: string }): Promise<{ success: boolean }>;
  getSystemColors(): Promise<{ accent1?: string, accent2?: string, accent3?: string, neutral1?: string }>;
  getOriginalWallpaper(): Promise<{ imageBase64: string }>;
  pickDate(options?: { current?: string }): Promise<{ date: string }>;
  pickColor(): Promise<{ color: string }>;
  pickTime(options?: { current?: string }): Promise<{ time: string }>;
  getColorsFromImage(options: { imageBase64: string }): Promise<{ background: string, primary: string, heatmapPalette: string }>;
  setBackgroundImage(options: { imageBase64: string | null }): Promise<{ success: boolean }>;
}

export const Wallpaper = registerPlugin<WallpaperPlugin>('Wallpaper');
