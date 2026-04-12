import React, { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion, useSpring } from 'motion/react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Calendar, Check, Circle, Download, Image as ImageIcon, Languages, LayoutGrid, Monitor, Palette, Sparkles, Square, Trash2, X, Save, Type } from 'lucide-react';

const triggerHaptic = () => {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }
};
import HeatmapCanvas from './components/HeatmapCanvas';
import { AppSettings, FONTS, IconSize, MonthLabelType, ShapeType, THEMES, TRANSLATIONS, FirstDayOfWeek } from './constants';
import { Wallpaper } from './plugins/wallpaper';

const VerticalPillIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="20" rx="4" />
  </svg>
);

const rgbToHex = (r: number, g: number, b: number) =>
  `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
const hexToRgb = (hex: string) => ({ r: parseInt(hex.slice(1, 3), 16) || 0, g: parseInt(hex.slice(3, 5), 16) || 0, b: parseInt(hex.slice(5, 7), 16) || 0 });
const toPortrait = (w: number, h: number) => (w > h ? { width: h, height: w } : { width: w, height: h });

const ColorWheel = ({ color, onChange }: { color: string, onChange: (hex: string) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const radius = canvas.width / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(radius, radius);
      ctx.arc(radius, radius, radius, startAngle, endAngle);
      const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }, []);

  const handlePick = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > rect.width / 2) return;
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const saturation = (distance / (rect.width / 2)) * 100;
    const f = (n: number) => {
      const k = (n + angle / 30) % 12;
      const c = 0.5 - (saturation / 200) * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * c).toString(16).padStart(2, '0');
    };
    onChange(`#${f(0)}${f(8)}${f(4)}`.toUpperCase());
  };

  return (
    <div className="relative w-56 h-56 mx-auto group my-6">
      <canvas
        ref={canvasRef} width={240} height={240}
        className="w-full h-full rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.8)] cursor-crosshair touch-none border-4 border-white/5 bg-black"
        onPointerDown={(e) => { isDragging.current = true; handlePick(e); e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (isDragging.current) handlePick(e); }}
        onPointerUp={(e) => { isDragging.current = false; e.currentTarget.releasePointerCapture(e.pointerId); }}
        onPointerCancel={(e) => { isDragging.current = false; e.currentTarget.releasePointerCapture(e.pointerId); }}
      />
      <div className="absolute inset-0 rounded-full pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]" />
    </div>
  );
};

const DEFAULT_SETTINGS: AppSettings = {
  appMode: 'push', countdownStart: new Date().toISOString().split('T')[0], countdownStartTime: '00:00', countdownEnd: new Date(new Date().getFullYear() + 1, 0, 1).toISOString().split('T')[0], countdownEndTime: '00:00',
  bgExposure: 60, percentSize: 1.0, percentDecimals: 4, percentOffsetY: 0, refreshInterval: 60,
  viewType: 'year', themeId: 'm3-blue', monthLabelType: 'abbr', monthFont: 'Share Tech Mono',
  firstDayOfWeek: 'auto',
  gridCols: 4, shapeType: 'rounded-square', iconSize: 'compact', resWidth: 1080, resHeight: 2400,
  language: 'zh', offsetY: 0, customDayColors: {}, customBottomText: '🪨', luckyMode: false, autoUpdateEnabled: false,
  birthDate: '2000-01-01', lifeValueMode: 'custom', customLifeValue: 80
};

const loadSafeSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem('sisyphus_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed, customDayColors: parsed.customDayColors || {} };
    }
  } catch (e) {
    localStorage.removeItem('sisyphus_settings');
  }
  return DEFAULT_SETTINGS;
};

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSafeSettings());
  const [activeTab, setActiveTab] = useState<'grid' | 'color' | 'text' | 'setup'>('grid');
  const [isApplying, setIsApplying] = useState(false);
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [customColor, setCustomColor] = useState('#D9656B');
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sisyphus_recent_colors');
      if (saved) return JSON.parse(saved);
    } catch(e){}
    return ['#D9656B', '#8AAEE0', '#E05B8F', '#F2D5D1'];
  });

  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startOffsetY, setStartOffsetY] = useState(0);

  // Parallax values
  const springConfig = { damping: 20, stiffness: 200, mass: 1 };
  const rotateX = useSpring(0, springConfig);
  const rotateY = useSpring(0, springConfig);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setStartY(e.clientY);
    setStartOffsetY(settings.offsetY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();

    // Calculate 3D Tilt (Parallax)
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxTilt = 8; // degrees
    const rX = ((e.clientY - cy) / (rect.height / 2)) * -maxTilt;
    const rY = ((e.clientX - cx) / (rect.width / 2)) * maxTilt;

    rotateX.set(Math.max(-maxTilt, Math.min(maxTilt, rX)));
    rotateY.set(Math.max(-maxTilt, Math.min(maxTilt, rY)));

    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    const deltaPercent = (deltaY / el.clientHeight) * 100;
    setSettings(s => ({ ...s, offsetY: Math.min(40, Math.max(-40, startOffsetY + deltaPercent)) }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    rotateX.set(0);
    rotateY.set(0);
  };

  const handlePointerLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  useEffect(() => {
    localStorage.setItem('sisyphus_settings', JSON.stringify(settings));
    localStorage.setItem('sisyphus_recent_colors', JSON.stringify(recentColors));
  }, [settings, recentColors]);

  const t = TRANSLATIONS[settings.language || 'zh'];
  const currentTheme = settings.themeId === 'custom' && settings.customTheme ? settings.customTheme : THEMES.find(th => th.id === settings.themeId) || THEMES[0];

  useEffect(() => {
    const detect = async () => {
      try {
        if (Capacitor.getPlatform() === 'android') {
          const r = await Wallpaper.getScreenResolution();
          const norm = toPortrait(r.width, r.height);
          setSettings(s => ({ ...s, resWidth: norm.width, resHeight: norm.height }));
        }
      } catch (e) { console.error("Resolution detect failed", e); }
    };
    detect();
  }, []);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const target = e.target;
    setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
  };

  const generateMatchingColors = (primary: string) => {
    const rgb = hexToRgb(primary);
    const accent = rgbToHex(Math.min(255, rgb.r + 40), Math.min(255, rgb.g + 20), Math.min(255, rgb.b + 60));
    const tertiary = rgbToHex(Math.max(0, rgb.r - 40), Math.max(0, rgb.g - 60), Math.max(0, rgb.b - 20));
    setSettings(current => ({
      ...current,
      themeId: 'custom',
      customTheme: { bg: primary, accent, colors: [primary, accent, tertiary, accent, tertiary, '#ffffff'] }
    }));
  };

  const handleDynamicColor = async () => {
    if (Capacitor.getPlatform() === 'android') {
      try {
        const sysColors = await Wallpaper.getSystemColors();
        if (sysColors && sysColors.accent1) generateMatchingColors(sysColors.accent1);
        else alert(settings.language === 'en' ? 'Dynamic Color not available.' : '动态配色不可用。');
      } catch (error) { console.error(error); }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (Capacitor.getPlatform() === 'android') {
        try {
          const res = await Wallpaper.getColorsFromImage({ imageBase64: dataUrl.split(',')[1] });
          setSettings(s => ({ ...s, themeId: 'custom', customTheme: { bg: res.background, accent: res.primary, colors: res.heatmapPalette.split(',') } }));
        } catch (error) { console.error(error); }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setSettings(s => ({ ...s, bgImage: dataUrl }));
      if (Capacitor.getPlatform() === 'android') {
        try { await Wallpaper.setBackgroundImage({ imageBase64: dataUrl.split(',')[1] }); } catch (e) { console.error(e); }
      }
    };
    reader.readAsDataURL(file);
  };

  const getCanvasData = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => b ? res(b) : rej(), 'image/png'));
    return new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onloadend = () => res((reader.result as string).split(',')[1]);
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      if (Capacitor.getPlatform() === 'android') {
        const base64 = await getCanvasData();
        await Wallpaper.setLockScreenWallpaper({
          imageBase64: base64,
          settings: { ...settings, bg: currentTheme.bg, accent: currentTheme.accent, colors: currentTheme.colors.join(',') } as any
        });
      }
    } catch(e) { console.error(e); alert('Apply failed'); }
    finally { setIsApplying(false); }
  };

  const handleExport = async () => {
    setIsApplying(true);
    try {
      if (Capacitor.getPlatform() === 'android') {
        const base64 = await getCanvasData();
        await Wallpaper.saveToGallery({ imageBase64: base64 });
        alert(t.actions.success || 'Success');
      } else {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const url = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `sisyphus-${Date.now()}.png`;
          link.href = url; link.click();
        }
      }
    } catch(e) { console.error(e); alert('Export failed'); }
    finally { setIsApplying(false); }
  };

  const handlePickDate = async (currentDate: string, setter: (d: string) => void) => {
    if (Capacitor.getPlatform() === 'android') {
      try {
        const res = await Wallpaper.pickDate({ current: currentDate });
        setter(res.date);
      } catch (e) { console.log('Date picker cancelled', e); }
    }
  };

  const handlePickTime = async (currentTime: string, setter: (t: string) => void) => {
    if (Capacitor.getPlatform() === 'android') {
      try {
        const res = await Wallpaper.pickTime({ current: currentTime });
        setter(res.time);
      } catch (e) { console.log('Time picker cancelled', e); }
    }
  };

  return (
    <div className="min-h-screen text-zinc-100 flex flex-col lg:flex-row overflow-hidden" style={{ backgroundColor: currentTheme.bg || '#04210b' }}>
      {/* Canvas Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ perspective: 1000 }}>
        <motion.div
          className="relative w-full max-w-[260px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-[2.5rem] bg-white/5 p-2 touch-none cursor-ns-resize border border-white/10"
          style={{ aspectRatio: `${settings.resWidth}/${settings.resHeight}`, rotateX, rotateY, zIndex: 10 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        >
          <div className="w-full h-full rounded-[2rem] overflow-hidden bg-black/40 pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
            <HeatmapCanvas {...settings} customTheme={settings.customTheme} />
          </div>
        </motion.div>
      </div>

      {/* Control Panel */}
      <div className="w-full lg:w-[480px] bg-[#0a1a0d]/95 backdrop-blur-3xl border-t lg:border-l border-white/10 p-6 flex flex-col space-y-6 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        <header className="flex justify-between items-center px-2 mb-2">
          <div className="flex-1 flex bg-black/40 p-1.5 rounded-full border border-white/10 relative mr-3">
            <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] bg-emerald-500 rounded-full transition-transform duration-300 ease-out shadow-md ${settings.appMode === 'down' ? 'translate-x-full' : 'translate-x-0'}`} style={{ zIndex: 0 }}></div>
            <button
              onClick={() => setSettings(s => ({ ...s, appMode: 'push' }))}
              className={`flex-1 py-3 text-sm font-bold transition-colors uppercase tracking-widest rounded-full relative z-10 ${settings.appMode === 'push' ? 'text-black' : 'text-zinc-400 hover:text-white'}`}>
              {t.modes.push}
            </button>
            <button
              onClick={() => setSettings(s => ({ ...s, appMode: 'down' }))}
              className={`flex-1 py-3 text-sm font-bold transition-colors uppercase tracking-widest rounded-full relative z-10 ${settings.appMode === 'down' ? 'text-black' : 'text-zinc-400 hover:text-white'}`}>
              {t.modes.down}
            </button>
          </div>
          <button
            onClick={() => setSettings(s => ({ ...s, language: s.language === 'en' ? 'zh' : 'en' }))}
            className="p-3.5 bg-black/40 hover:bg-white/10 rounded-full transition-colors relative z-10 border border-white/10 flex-shrink-0">
            <Languages size={18} className="text-zinc-200"/>
          </button>
        </header>

        <nav className="flex bg-transparent p-1 mt-2">
          {(['grid', 'color', 'text', 'setup'] as const).map((tab) => (
            <button key={tab} onClick={() => { triggerHaptic(); setActiveTab(tab); }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-emerald-900/40 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {t.tabs[tab as keyof typeof t.tabs]}
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto overflow-x-hidden space-y-6 max-h-[400px] px-1 pb-8 relative">
          <motion.div
            key={activeTab}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={(e, { offset }) => {
              const TABS = ['grid', 'color', 'text', 'setup'] as const;
              const idx = TABS.indexOf(activeTab);
              if (offset.x < -50 && idx < TABS.length - 1) { triggerHaptic(); setActiveTab(TABS[idx + 1]); }
              else if (offset.x > 50 && idx > 0) { triggerHaptic(); setActiveTab(TABS[idx - 1]); }
            }}
            className="w-full h-full"
          >
          {/* TAB 1: 布局 (Grid) */}
          {activeTab === 'grid' && (
            <div className="space-y-6">
              {settings.appMode === 'push' ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.grid.mode}</span>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setSettings(s => ({ ...s, viewType: 'year' }))} className={`py-4 rounded-2xl border text-sm font-bold transition-colors ${settings.viewType === 'year' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/20 border-transparent text-zinc-500 hover:bg-white/5'}`}>{t.grid.year}</button>
                      <button onClick={() => setSettings(s => ({ ...s, viewType: 'merged' }))} className={`py-4 rounded-2xl border text-sm font-bold transition-colors ${settings.viewType === 'merged' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/20 border-transparent text-zinc-500 hover:bg-white/5'}`}>{t.grid.merged || 'Merged'}</button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.grid.firstDay}</span>
                    <div className="grid grid-cols-2 gap-3">
                      {(['sunday', 'monday'] as FirstDayOfWeek[]).map(day => (
                        <button
                          key={day}
                          onClick={() => setSettings(s => ({ ...s, firstDayOfWeek: day }))}
                          className={`py-4 rounded-2xl border text-sm font-bold transition-colors ${settings.firstDayOfWeek === day ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/20 border-transparent text-zinc-500 hover:bg-white/5'}`}
                        >
                          {t.grid.weekdays[day]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.grid.cols}</span>
                    <div className="grid grid-cols-2 gap-3">
                      {[3, 4].map(c => <button key={c} onClick={() => setSettings(s => ({ ...s, gridCols: c as any }))} className={`py-4 rounded-full border text-sm font-bold transition-colors ${settings.gridCols === c ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/20 border-transparent text-zinc-500 hover:bg-white/5'}`}>{c}</button>)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-black/20 p-4 rounded-3xl border border-white/5 space-y-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] text-zinc-500 font-bold">{t.countdown.start}</span>
                      <div className="flex gap-2">
                        {Capacitor.getPlatform() === 'android' ? (
                          <>
                            <button onClick={() => handlePickDate(settings.countdownStart, d => setSettings(s => ({ ...s, countdownStart: d })))} className="flex-[2] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-left text-zinc-300 font-bold">{settings.countdownStart}</button>
                            <button onClick={() => handlePickTime(settings.countdownStartTime, t => setSettings(s => ({ ...s, countdownStartTime: t })))} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-center text-zinc-300 font-bold">{settings.countdownStartTime}</button>
                          </>
                        ) : (
                          <>
                            <input type="date" value={settings.countdownStart} onChange={e => setSettings(s => ({ ...s, countdownStart: e.target.value }))} className="flex-[2] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none font-bold text-zinc-300" />
                            <input type="time" value={settings.countdownStartTime} onChange={e => setSettings(s => ({ ...s, countdownStartTime: e.target.value }))} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none font-bold text-zinc-300" />
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] text-zinc-500 font-bold">{t.countdown.end}</span>
                      <div className="flex gap-2">
                        {Capacitor.getPlatform() === 'android' ? (
                          <>
                            <button onClick={() => handlePickDate(settings.countdownEnd, d => setSettings(s => ({ ...s, countdownEnd: d })))} className="flex-[2] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-left text-zinc-300 font-bold">{settings.countdownEnd}</button>
                            <button onClick={() => handlePickTime(settings.countdownEndTime, t => setSettings(s => ({ ...s, countdownEndTime: t })))} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-center text-zinc-300 font-bold">{settings.countdownEndTime}</button>
                          </>
                        ) : (
                          <>
                            <input type="date" value={settings.countdownEnd} onChange={e => setSettings(s => ({ ...s, countdownEnd: e.target.value }))} className="flex-[2] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none font-bold text-zinc-300" />
                            <input type="time" value={settings.countdownEndTime} onChange={e => setSettings(s => ({ ...s, countdownEndTime: e.target.value }))} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none font-bold text-zinc-300" />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.down.exposure}</span>
                    <input type="range" min="0" max="100" value={settings.bgExposure ?? 60} onChange={e => setSettings(s => ({...s, bgExposure: Number(e.target.value)}))} className="w-full accent-emerald-500" />
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.down.percentSize}</span>
                    <input type="range" min="0.2" max="2.0" step="0.1" value={settings.percentSize ?? 1.0} onChange={e => setSettings(s => ({...s, percentSize: Number(e.target.value)}))} className="w-full accent-emerald-500" />
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.down.decimals}</span>
                    <div className="grid grid-cols-5 gap-2">
                        {[0,1,2,3,4].map(d => (
                            <button key={d} onClick={() => {triggerHaptic(); setSettings(s => ({...s, percentDecimals: d}))}} className={`py-2 rounded-xl border text-sm font-bold transition-colors ${settings.percentDecimals === d ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/20 border-transparent text-zinc-500 hover:bg-white/5'}`}>{d}</button>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.grid.shape}</span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'square', icon: Square },
                    { id: 'rounded-square', icon: LayoutGrid },
                    { id: 'circle', icon: Circle },
                    { id: 'vertical-pill', icon: VerticalPillIcon }
                  ].map(sh => (
                    <button key={sh.id} onClick={() => setSettings(s => ({ ...s, shapeType: sh.id as ShapeType }))} className={`p-4 rounded-2xl border flex items-center justify-center transition-colors ${settings.shapeType === sh.id ? 'bg-white/10 border-emerald-500/50 text-emerald-400 shadow-inner' : 'bg-black/20 border-transparent text-zinc-600 hover:text-zinc-400'}`}>
                      <sh.icon size={28} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.grid.size}</span>
                <div className="grid grid-cols-2 gap-3">
                  {['compact', 'loose'].map(sz => (
                    <button key={sz} onClick={() => setSettings(s => ({ ...s, iconSize: sz as any }))} className={`py-3 rounded-2xl border text-xs font-bold transition-colors ${settings.iconSize === sz ? 'bg-white/10 border-white/20 text-white' : 'bg-black/20 border-transparent text-zinc-500'}`}>
                      {sz === 'compact' ? (settings.language === 'zh' ? '紧凑' : 'Compact') : (settings.language === 'zh' ? '宽松' : 'Loose')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-6 pb-2">
                <button onClick={handleApply} disabled={isApplying} className="flex-[2] py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 transition-all">
                  {isApplying ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-black border-t-transparent rounded-full" /> : <><Check size={18}/> {t.actions?.apply || 'Set Wallpaper'}</>}
                </button>

                <button onClick={handleExport} disabled={isApplying} className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 bg-white/10 text-white border border-white/5 shadow-lg hover:bg-white/20 active:scale-95 disabled:opacity-50 transition-all">
                  <Download size={16}/> {t.actions?.export || 'Export'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: 颜色 (Color) */}
          {activeTab === 'color' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                {THEMES.map(th => (
                  <button key={th.id} onClick={() => { triggerHaptic(); setSettings(s => ({ ...s, themeId: th.id, customTheme: undefined })); }} className={`relative p-3 rounded-2xl border transition-all ${settings.themeId === th.id ? 'border-transparent shadow-lg' : 'border-transparent bg-black/20 hover:bg-white/5'} flex flex-col items-center gap-2`}>
                    {settings.themeId === th.id && (
                      <motion.div layoutId="active-theme" transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="absolute inset-0 bg-white/10 border border-emerald-500/50 rounded-2xl pointer-events-none" />
                    )}
                    <div className="relative z-10 w-full flex gap-0.5 rounded-lg overflow-hidden h-6 shadow-inner border border-white/5">
                      {th.colors.slice(0,3).map((c,i)=><div key={i} className="h-full flex-1" style={{backgroundColor:c}}/>)}
                    </div>
                    <p className={`relative z-10 text-[8px] font-black uppercase text-center leading-tight truncate w-full tracking-wider ${settings.themeId === th.id ? 'text-white' : 'text-zinc-400'}`}>
                      {settings.language === 'zh' ? th.name.zh : (<>{th.name.en.split(' ')[0]}<br/>{th.name.en.split(' ')[1] || ''}</>)}
                    </p>
                  </button>
                ))}
              </div>

              <div className="bg-black/30 p-4 rounded-3xl border border-white/5 space-y-3">
                <button onClick={handleDynamicColor} className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-xs font-bold text-zinc-300">
                  <Sparkles className="w-4 h-4 text-emerald-400" /> {t.color.dynamic || 'Dynamic Color'}
                </button>

                <label className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                  <ImageIcon className="w-4 h-4 text-blue-400" /> {t.color.extract} <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>

                <label className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                  <Monitor className="w-4 h-4 text-purple-400" /> {t.color.bgImage || 'Background Image'} <input type="file" className="hidden" accept="image/*" onChange={handleBgImageUpload} />
                </label>

                {settings.bgImage && (
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden mt-3 border border-white/10 shadow-inner bg-black/50">
                    <img src={settings.bgImage} className="w-full h-full object-cover opacity-60" />
                    <button onClick={() => {
                      setSettings(s => ({ ...s, bgImage: undefined }));
                      if (Capacitor.getPlatform() === 'android') Wallpaper.setBackgroundImage({ imageBase64: null });
                    }} className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-500 p-2 rounded-xl text-white shadow-xl transition-transform active:scale-95"><Trash2 size={16}/></button>
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 px-2">
                  <span className="text-xs font-bold text-zinc-400 flex items-center gap-2"><Sparkles size={14} className="text-pink-400"/> {t.color.luckyMode}</span>
                  <button onClick={() => setSettings(s => ({ ...s, luckyMode: !s.luckyMode }))} className={`w-10 h-6 rounded-full p-1 transition-colors ${settings.luckyMode ? 'bg-pink-500' : 'bg-zinc-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.luckyMode ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{settings.language === 'zh' ? '特殊日子颜色' : 'Special Days'}</span>
                  <Palette className="w-3.5 h-3.5 text-zinc-500" />
                </div>

                <div className="bg-black/20 p-4 rounded-3xl border border-white/5 space-y-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                        />
                        <div
                          className="w-14 h-14 rounded-2xl shadow-xl border-2 border-white/20 flex items-center justify-center overflow-hidden"
                          style={{ backgroundColor: customColor }}
                        />
                      </div>

                      <div className="flex-1 space-y-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Hex Color</span>
                        <input
                          type="text"
                          value={customColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^#?[0-9A-F]{0,6}$/i.test(val)) setCustomColor(val.startsWith('#') ? val : '#' + val);
                          }}
                          onFocus={handleFocus}
                          className="w-full bg-transparent border-b border-white/10 pb-1 outline-none text-xl font-mono font-bold text-zinc-200"
                        />
                      </div>
                    </div>

                    <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                      <ColorWheel color={customColor} onChange={setCustomColor} />
                    </div>

                    <div className="flex items-center gap-3">
                      {Capacitor.getPlatform() === 'android' ? (
                        <button onClick={async () => { try { const res = await Wallpaper.pickDate({ current: customDate }); setCustomDate(res.date); } catch(e){} }} className="flex-1 bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm text-left text-zinc-300 font-bold">{customDate}</button>
                      ) : (
                        <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="flex-1 bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm outline-none font-bold text-zinc-300" />
                      )}

                      <button onClick={() => setSettings(s => ({ ...s, customDayColors: { ...s.customDayColors, [customDate]: customColor } }))} className="bg-emerald-500 hover:bg-emerald-600 text-black px-5 py-3 rounded-xl text-sm font-black shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2">
                        <Check size={16}/> 保存
                      </button>
                    </div>
                  </div>

                  {Object.keys(settings.customDayColors).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                      {Object.entries(settings.customDayColors).map(([date, color]) => (
                        <div key={date} className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-lg pl-2 pr-1.5 py-1.5 text-[10px]">
                          <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                          <span className="text-zinc-300 font-mono font-bold">{date}</span>
                          <button onClick={() => setSettings(s => { const newColors = { ...s.customDayColors }; delete newColors[date]; return { ...s, customDayColors: newColors }; })} className="p-1 hover:bg-white/10 rounded-md">
                            <X className="w-3 h-3 text-zinc-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 文字与标签 (Text) */}
          {activeTab === 'text' && (
            <div className="space-y-6">
              <div className="bg-black/20 p-5 rounded-3xl border border-white/5 space-y-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.text?.bottomText || 'Bottom Text'}</span>
                <input type="text" value={settings.customBottomText} onFocus={handleFocus} onChange={e => setSettings(s => ({ ...s, customBottomText: e.target.value }))} className="w-full bg-transparent border-b border-white/10 pb-2 outline-none text-sm font-bold placeholder-zinc-700" placeholder={t.text?.bottomTextPlaceholder || 'e.g. 2026 Annual Heatmap'} />
              </div>

              <div className="bg-black/20 p-5 rounded-3xl border border-white/5 space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.text?.labelStyle || 'Month Style'}</span>
                  <span className="text-[9px] text-zinc-600 block mb-3">{t.text?.labelDesc || 'Select display format'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['full', 'abbr', 'none'].map(l => (
                    <button key={l} onClick={() => setSettings(s => ({ ...s, monthLabelType: l as any }))} className={`py-3 rounded-xl border text-[10px] font-bold uppercase transition-colors ${settings.monthLabelType === l ? 'bg-white/10 border-white/20 text-white' : 'bg-black/20 border-transparent text-zinc-600'}`}>{l}</button>
                  ))}
                </div>
              </div>

              <div className="bg-black/20 p-5 rounded-3xl border border-white/5 space-y-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Type className="w-3.5 h-3.5"/> {t.text?.labelFont || 'Font'}</span>
                <div className="grid grid-cols-1 gap-2">
                  {FONTS.map(f => (
                    <button key={f.name} onClick={() => setSettings(s => ({ ...s, monthFont: f.name }))} style={{ fontFamily: f.family }} className={`py-4 rounded-2xl border text-sm transition-colors ${settings.monthFont === f.name ? 'bg-white/10 border-emerald-500/30 text-emerald-400' : 'bg-black/20 border-transparent text-zinc-400 hover:bg-white/5'}`}>{f.name}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 设置 (Setup) */}
          {activeTab === 'setup' && (
            <div className="space-y-4">
              <div className="flex flex-col bg-black/20 p-5 rounded-3xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-bold text-zinc-300 block">{t.setup.autoUpdate}</span>
                    <span className="text-[10px] text-zinc-500">{settings.appMode === 'push' ? (settings.language === 'zh' ? '每天 0 点自动刷新壁纸' : 'Auto updates daily at midnight') : t.setup.autoUpdateDesc}</span>
                  </div>
                  <button onClick={() => { triggerHaptic(); setSettings(s => ({ ...s, autoUpdateEnabled: !s.autoUpdateEnabled })); }} className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.autoUpdateEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-md ${settings.autoUpdateEnabled ? 'translate-x-6' : ''}`} />
                  </button>
                </div>

                {settings.autoUpdateEnabled && settings.appMode === 'down' && (
                  <div className="pt-4 border-t border-white/5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">{t.setup.refreshInterval || 'Refresh Interval'}</span>
                    <div className="grid grid-cols-4 gap-2">
                       {[{v: 60, l: t.setup.hour1 || '1 Hour'}, {v: 360, l: t.setup.hour6 || '6 Hours'}, {v: 720, l: t.setup.hour12 || '12 Hours'}, {v: 1440, l: t.setup.daily || 'Daily'}].map(opt => (
                         <button key={opt.v} onClick={() => { triggerHaptic(); setSettings(s => ({...s, refreshInterval: opt.v})); }} className={`py-2 rounded-xl border text-[10px] font-bold transition-colors ${settings.refreshInterval === opt.v ? 'bg-white/10 text-emerald-400 border-emerald-500/30' : 'border-transparent bg-black/20 text-zinc-500'}`}>{opt.l}</button>
                       ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-black/20 p-5 rounded-3xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{t.setup.version || 'Version'}</span>
                  <span className="text-xs font-mono font-bold text-zinc-300">1.0.0</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{t.setup.github || 'GitHub'}</span>
                  <a href="https://github.com/yishin-shen/Sisyphus" target="_blank" rel="noreferrer" className="text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 transition-colors">GitHub</a>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{settings.language === 'zh' ? '隐私政策' : 'Privacy Policy'}</span>
                  <a href="https://github.com/yishin-shen/Sisyphus/blob/master/PRIVACY.md" target="_blank" rel="noreferrer" className="text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 transition-colors">{settings.language === 'zh' ? '阅读' : 'Read'}</a>
                </div>
              </div>

              <div className="pt-8 pb-4 text-center">
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.25em] flex justify-center items-center gap-2">
                  {settings.language === 'zh' ? '极简 · 自由 · 开源 · 本地' : 'Minimal · Free · Open · Local'}
                </p>
              </div>
            </div>
          )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
