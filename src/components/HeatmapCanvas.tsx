import React, { useRef, useEffect } from 'react';
import { THEMES, ViewType, ShapeType, MonthLabelType, FONTS, LifeValueMode, IconSize, AppMode, FirstDayOfWeek } from '../constants';
import {
  ABBR_MONTH_LABELS,
  FULL_MONTH_LABELS,
  getCountdownDayColor,
  getDateKey,
  getDayColor,
  getStartDayOffset,
  parseLocalDateTime,
} from '../rendering/wallpaperPlan';

interface HeatmapCanvasProps {
  appMode: AppMode;
  countdownStart: string;
  countdownStartTime: string;
  countdownEnd: string;
  countdownEndTime: string;
  viewType: ViewType;
  themeId: string;
  birthDate: string;
  lifeValueMode: LifeValueMode;
  customLifeValue: number;
  monthLabelType: MonthLabelType;
  monthFont: string;
  firstDayOfWeek: FirstDayOfWeek;
  gridCols: number;
  shapeType: ShapeType;
  iconSize: IconSize;
  resWidth: number;
  resHeight: number;
  customTheme?: {
    bg: string;
    accent: string;
    colors: string[];
  };
  offsetY: number;
  customDayColors: Record<string, string>;
  customBottomText: string;
  luckyMode: boolean;
  bgImage?: string;
  bgExposure?: number;
  percentSize?: number;
  percentDecimals?: number;
}

const HeatmapCanvas: React.FC<HeatmapCanvasProps> = ({
  appMode, countdownStart, countdownStartTime, countdownEnd, countdownEndTime, viewType, themeId, birthDate, lifeValueMode, customLifeValue, monthLabelType, monthFont, firstDayOfWeek, gridCols, shapeType, iconSize, resWidth, resHeight, customTheme, offsetY, customDayColors, customBottomText, luckyMode, bgImage, bgExposure, percentSize, percentDecimals
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawShape = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, type: ShapeType, color: string, scale: number = 1.0) => {
    if (scale <= 0.01) return;
    const s = size * scale;
    const cx = x + size / 2;
    const cy = y + size / 2;
    const sx = cx - s / 2;
    const sy = cy - s / 2;

    ctx.fillStyle = color;
    ctx.beginPath();
    switch (type) {
      case 'circle': ctx.arc(cx, cy, s / 2, 0, Math.PI * 2); break;
      case 'vertical-pill':
        const pw = s * 0.45;
        const px = sx + (s - pw) / 2;
        const pr = pw / 2;
        ctx.moveTo(px + pr, sy);
        ctx.arcTo(px + pw, sy, px + pw, sy + s, pr);
        ctx.arcTo(px + pw, sy + s, px, sy + s, pr);
        ctx.arcTo(px, sy + s, px, sy, pr);
        ctx.arcTo(px, sy, px + pw, sy, pr);
        break;
      case 'rounded-square':
        const r = s * 0.2;
        ctx.moveTo(sx + r, sy); ctx.arcTo(sx + s, sy, sx + s, sy + s, r);
        ctx.arcTo(sx + s, sy + s, sx, sy + s, r); ctx.arcTo(sx, sy + s, sx, sy, r);
        ctx.arcTo(sx, sy, sx + s, sy, r); break;
      case 'square': default: ctx.rect(sx, sy, s, s); break;
    }
    ctx.closePath();
    ctx.fill();
  };

  const drawGlassCard = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, theme: any) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y); ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius); ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius); ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.stroke();
  };

  const renderSeparatedHeatmap = (ctx: CanvasRenderingContext2D, width: number, height: number, theme: any, t: number) => {
    const now = new Date();
    const year = now.getFullYear();
    const cols = Math.max(3, Math.min(4, gridCols));
    const rows = Math.ceil(12 / cols);

    const cardMarginX = width * 0.08;
    const cardMarginY = height * 0.35 + (offsetY / 100) * height;
    const cardWidth = width - 2 * cardMarginX;
    const paddingX = cardWidth * 0.06;
    const paddingY = cardWidth * 0.08;
    const colGap = cardWidth * 0.05;
    const rowGap = cardWidth * 0.08;

    const blockWidth = (cardWidth - 2 * paddingX - (cols - 1) * colGap) / cols;
    const cellSize = iconSize === 'compact' ? blockWidth / 7.2 : blockWidth / 8.5;
    const cellGap = iconSize === 'compact' ? cellSize * 0.15 : cellSize * 0.4;
    const gridWidth = 7 * cellSize + 6 * cellGap;
    const gridHeight = 6 * cellSize + 5 * cellGap;

    const labelFontSize = cellSize * 1.4;
    const labelGap = cellSize * 0.6;
    const labelHeight = monthLabelType !== 'none' ? labelFontSize : 0;
    const effectiveLabelGap = monthLabelType !== 'none' ? labelGap : 0;
    const blockHeight = labelHeight + effectiveLabelGap + gridHeight;

    const cardHeight = 2 * paddingY + rows * blockHeight + (rows - 1) * rowGap;
    const actualColGap = cols > 1 ? (cardWidth - 2 * paddingX - gridWidth * cols) / (cols - 1) : 0;

    drawGlassCard(ctx, cardMarginX, cardMarginY, cardWidth, cardHeight, 40, theme);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const fontConfig = FONTS.find(f => f.name === monthFont) || FONTS[0];
    ctx.font = `${cellSize * 1.5}px ${fontConfig.family}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(customBottomText || '🪨', width / 2, cardMarginY + cardHeight + 60);

    for (let mIndex = 0; mIndex < 12; mIndex++) {
      const colIndex = mIndex % cols;
      const rowIndex = Math.floor(mIndex / cols);
      const startX = cardMarginX + paddingX + colIndex * (gridWidth + actualColGap);
      const startY = cardMarginY + paddingY + rowIndex * (blockHeight + rowGap);

      if (monthLabelType !== 'none') {
        const label = monthLabelType === 'abbr' ? ABBR_MONTH_LABELS[mIndex] : FULL_MONTH_LABELS[mIndex];
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `bold ${labelFontSize}px ${fontConfig.family}`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(label, startX, startY);
      }

      const gridStartY = startY + labelHeight + effectiveLabelGap;
      const firstDayOfMonth = new Date(year, mIndex, 1);
      const daysInMonth = new Date(year, mIndex + 1, 0).getDate();
      const startDayOffset = getStartDayOffset(firstDayOfMonth, firstDayOfWeek);

      for (let d = 0; d < daysInMonth; d++) {
        const dayPos = d + startDayOffset;
        const x = startX + (dayPos % 7) * (cellSize + cellGap);
        const y = gridStartY + Math.floor(dayPos / 7) * (cellSize + cellGap);

        const date = new Date(year, mIndex, d + 1);
        const dateKey = getDateKey(year, mIndex, d + 1);
        const color = getDayColor({ date, dateKey, now, theme, luckyMode, customDayColors });

        const delay = (mIndex * 30 + d) / 400; // Left-to-right top-to-bottom wave
        const progress = Math.max(0, Math.min(1, (t - delay) / 0.5));
        const scale = 1 - Math.pow(1 - progress, 3); // Cubic ease out
        drawShape(ctx, x, y, cellSize, shapeType, color, scale);
      }
    }
  };

  const renderMergedHeatmap = (ctx: CanvasRenderingContext2D, width: number, height: number, theme: any, t: number) => {
    const now = new Date();
    const year = now.getFullYear();

    const mc = Math.max(3, Math.min(4, gridCols));
    const mr = Math.ceil(12 / mc);
    const totalCols = mc * 7;
    const totalRows = mr * 5;

    const cardMarginX = width * 0.08;
    const cardMarginY = height * 0.35 + (offsetY / 100) * height;
    const cardWidth = width - 2 * cardMarginX;

    const paddingX = cardWidth * 0.06;
    const paddingY = cardWidth * 0.08;
    const gapRatio = iconSize === 'compact' ? 0.15 : 0.4;

    const gridAvailableWidth = cardWidth - 2 * paddingX;
    const cellSize = gridAvailableWidth / (totalCols + (totalCols - 1) * gapRatio);
    const cellGap = cellSize * gapRatio;

    const gridHeight = totalRows * cellSize + (totalRows - 1) * cellGap;
    const cardHeight = 2 * paddingY + gridHeight;

    drawGlassCard(ctx, cardMarginX, cardMarginY, cardWidth, cardHeight, 40, theme);

    const fontConfig = FONTS.find(f => f.name === monthFont) || FONTS[0];
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = `${cellSize * 2.0}px ${fontConfig.family}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(customBottomText || '🪨', width / 2, cardMarginY + cardHeight + 60);

    const startX = cardMarginX + paddingX;
    const startY = cardMarginY + paddingY;

    for (let mIndex = 0; mIndex < 12; mIndex++) {
      const mCol = mIndex % mc;
      const mRow = Math.floor(mIndex / mc);
      const mOffsetX = mCol * 7;
      const mOffsetY = mRow * 5;

      const firstDayOfMonth = new Date(year, mIndex, 1);
      const daysInMonth = new Date(year, mIndex + 1, 0).getDate();
      const startDayOffset = getStartDayOffset(firstDayOfMonth, firstDayOfWeek);

      for (let d = 0; d < daysInMonth; d++) {
        const dayPos = d + startDayOffset;
        const localCol = dayPos % 7;
        const localRow = Math.floor(dayPos / 7) % 5; // Seamless wrap around for 6th week

        const globalCol = mOffsetX + localCol;
        const globalRow = mOffsetY + localRow;

        const x = startX + globalCol * (cellSize + cellGap);
        const y = startY + globalRow * (cellSize + cellGap);

        const date = new Date(year, mIndex, d + 1);
        const dateKey = getDateKey(year, mIndex, d + 1);
        const color = getDayColor({ date, dateKey, now, theme, luckyMode, customDayColors });

        const delay = (mIndex * 30 + d) / 400; // Left-to-right top-to-bottom wave
        const progress = Math.max(0, Math.min(1, (t - delay) / 0.5));
        const scale = 1 - Math.pow(1 - progress, 3); // Cubic ease out
        drawShape(ctx, x, y, cellSize, shapeType, color, scale);
      }
    }
  };

  const renderCountdownHeatmap = (ctx: CanvasRenderingContext2D, width: number, height: number, theme: any, t: number) => {
    const start = parseLocalDateTime(countdownStart, countdownStartTime || '00:00');
    const end = parseLocalDateTime(countdownEnd, countdownEndTime || '00:00');
    const now = new Date();

    const startStart = start.getTime();
    const endStart = end.getTime();
    const nowTime = now.getTime();

    let totalDays = Math.max(1, Math.ceil((endStart - startStart) / (1000 * 60 * 60 * 24)));
    const passedDays = Math.floor((nowTime - startStart) / (1000 * 60 * 60 * 24));

    const exactPassed = (nowTime - startStart);
    const exactTotal = (endStart - startStart);
    let percent = exactTotal > 0 ? (exactPassed / exactTotal) * 100 : 0;
    percent = Math.max(0, Math.min(100, percent));

    const paddingX = width * 0.04;
    const paddingTop = height * 0.1;
    const paddingBottom = height * 0.1;

    const availableWidth = width - 2 * paddingX;
    const availableHeight = height - paddingTop - paddingBottom;

    const gapRatio = iconSize === 'compact' ? 0.15 : 0.4;

    let bestCols = 1;
    let maxCellSize = 0;

    const startSearch = Math.max(1, Math.floor(Math.sqrt(totalDays * (availableWidth / availableHeight))) - 200);
    const endSearch = Math.min(totalDays, startSearch + 400);

    for (let c = startSearch; c <= endSearch; c++) {
       const r = Math.ceil(totalDays / c);
       const sW = availableWidth / (c + (c - 1) * gapRatio);
       const sH = availableHeight / (r + (r - 1) * gapRatio);
       const s = Math.min(sW, sH);
       if (s > maxCellSize) {
           maxCellSize = s;
           bestCols = c;
       }
    }

    const cols = bestCols;
    const rows = Math.ceil(totalDays / cols);
    const cellGap = maxCellSize * gapRatio;
    const gridWidth = cols * maxCellSize + (cols - 1) * cellGap;
    const gridHeight = rows * maxCellSize + (rows - 1) * cellGap;

    const startX = paddingX + (availableWidth - gridWidth) / 2;
    const startY = paddingTop + (availableHeight - gridHeight) / 2;

    const fontConfig = FONTS.find(f => f.name === monthFont) || FONTS[0];

    for (let d = 0; d < totalDays; d++) {
      const col = d % cols;
      const row = Math.floor(d / cols);

      const x = startX + col * (maxCellSize + cellGap);
      const y = startY + row * (maxCellSize + cellGap);

      const color = getCountdownDayColor(d, passedDays, d === passedDays && nowTime <= endStart && nowTime >= startStart, startStart, theme, luckyMode);

      const delay = (d / totalDays) * 0.8;
      const progress = Math.max(0, Math.min(1, (t - delay) / 0.5));
      const scale = 1 - Math.pow(1 - progress, 3); // Cubic ease out

      drawShape(ctx, x, y, maxCellSize, shapeType, color, scale);
    }

    ctx.fillStyle = `rgba(0, 0, 0, ${(bgExposure ?? 60) / 100})`;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = theme.accent || '#FFF';
    const pSize = percentSize ?? 1.0;
    // Add vertical offset via global offsetY dragging
    const pOffset = (offsetY / 100) * height;
    ctx.font = `bold ${width * 0.2 * pSize}px ${fontConfig.family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${percent.toFixed(percentDecimals ?? 4)}%`, width / 2, height / 2 + pOffset);

    if (customBottomText) {
        ctx.font = `${width * 0.05}px ${fontConfig.family}`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText(customBottomText, width / 2, height - paddingBottom / 2);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isCancelled = false;
    const animStartTime = Date.now();

    const render = async () => {
      if (isCancelled) return;
      const theme = themeId === 'custom' && customTheme ? customTheme : (THEMES.find(t => t.id === themeId) || THEMES[0]);

      const width = resWidth || 1080;
      const height = resHeight || 1920;
      canvas.width = width;
      canvas.height = height;

      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, width, height);

      if (bgImage) {
        try {
          const img = new Image();
          img.src = bgImage;
          await new Promise((res) => { img.onload = res; img.onerror = res; });
          if (isCancelled) return;
          const scale = Math.max(width / img.width, height / img.height);
          ctx.drawImage(img, (width - img.width * scale)/2, (height - img.height * scale)/2, img.width * scale, img.height * scale);
        } catch(e) { console.error("Canvas Bg Image Error", e); }
      }

      if (isCancelled) return;

      const t = Math.max(0, (Date.now() - animStartTime) / 1000);

      try {
        if (appMode === 'down') {
          renderCountdownHeatmap(ctx, width, height, theme, t);
        } else if (viewType === 'merged') {
          renderMergedHeatmap(ctx, width, height, theme, t);
        } else {
          renderSeparatedHeatmap(ctx, width, height, theme, t);
        }
      } catch (error) {
        console.error("Heatmap Canvas Render Error:", error);
      }

      // Keep re-rendering if in down mode or animating
      if (t < 2.0 || appMode === 'down') {
         animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [appMode, countdownStart, countdownStartTime, countdownEnd, countdownEndTime, viewType, themeId, monthLabelType, monthFont, firstDayOfWeek, gridCols, shapeType, iconSize, resWidth, resHeight, customTheme, offsetY, customDayColors, customBottomText, luckyMode, bgImage, bgExposure, percentSize, percentDecimals]);

  return <canvas ref={canvasRef} className="w-full h-full block object-fill" />;
};

export default HeatmapCanvas;
