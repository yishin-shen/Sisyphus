package com.yishin.sisyphus;

import android.app.WallpaperManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import java.io.File;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.os.Build;
import android.util.DisplayMetrics;

import android.util.Log;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.util.Calendar;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import androidx.core.app.NotificationCompat;
import java.text.SimpleDateFormat;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import org.json.JSONObject;

public class WallpaperWorker extends Worker {
    private static final String TAG = "WallpaperWorker";
    private static final String CHANNEL_ID = "wallpaper_update_channel";

    public WallpaperWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "Starting wallpaper update work...");
        Context context = getApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences(WallpaperScheduler.PREFS_NAME, Context.MODE_PRIVATE);
        long settingsVersion = prefs.getLong("settingsUpdatedAt", 0L);

        if (!prefs.getBoolean("autoUpdateEnabled", false)) {
            Log.d(TAG, "Auto update disabled, skipping.");
            return Result.success();
        }

        try {
            // 1. Get current resolution - Fallback to saved ones if possible
            DisplayMetrics metrics = context.getResources().getDisplayMetrics();
            int width = prefs.getInt("screenWidth", metrics.widthPixels);
            int height = prefs.getInt("screenHeight", metrics.heightPixels);
            
            if (width <= 0 || height <= 0) {
                width = metrics.widthPixels;
                height = metrics.heightPixels;
            }
            Log.d(TAG, "Resolution used: " + width + "x" + height);

            // 2. Generate Bitmap
            Bitmap bitmap = generateHeatmap(context, prefs, width, height);
            Log.d(TAG, "Bitmap generated successfully");

            if (prefs.getLong("settingsUpdatedAt", 0L) != settingsVersion) {
                Log.d(TAG, "Settings changed while worker was running, skipping stale wallpaper update.");
                return Result.success();
            }

            // 3. Set Wallpaper Silently
            WallpaperManager wm = WallpaperManager.getInstance(context);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                // On some devices, setting just FLAG_LOCK might not take effect immediately or be blocked.
                // We try setting both to be sure, or just the lock screen as requested.
                // If it's a "silent" update, we usually want both to match the current status.
                int resultLock = wm.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK | WallpaperManager.FLAG_SYSTEM);
                Log.d(TAG, "Wallpaper set result (LOCK+SYSTEM): " + resultLock);
            } else {
                wm.setBitmap(bitmap);
                Log.d(TAG, "Wallpaper set via legacy method");
            }

            sendNotification(context);

            return Result.success();
        } catch (Exception e) {
            Log.e(TAG, "Error updating wallpaper", e);
            return Result.retry();
        }
    }

    private Bitmap generateHeatmap(Context context, SharedPreferences prefs, int width, int height) {
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        // Fetch Settings
        String bgColor = prefs.getString("bg", "#001d35");
        String accentColor = prefs.getString("accent", "#7cc0ff");
        String colorsStr = prefs.getString("colors", "#001d35,#004a77,#00629d,#007cc0,#3898e3,#7cc0ff");
        String[] palette = colorsStr.split(",");
        String appMode = prefs.getString("appMode", "push");
        String viewType = prefs.getString("viewType", "year");
        String firstDayOfWeek = prefs.getString("firstDayOfWeek", "auto");
        String monthLabelType = prefs.getString("monthLabelType", "abbr");
        String countdownStart = prefs.getString("countdownStart", "");
        String countdownStartTime = prefs.getString("countdownStartTime", "00:00");
        String countdownEnd = prefs.getString("countdownEnd", "");
        String countdownEndTime = prefs.getString("countdownEndTime", "00:00");
        int bgExposure = prefs.getInt("bgExposure", 60);
        float percentSize = prefs.getFloat("percentSize", 1.0f);
        int percentDecimals = prefs.getInt("percentDecimals", 4);
        int gridCols = prefs.getInt("gridCols", 4);
        float offsetY = prefs.getFloat("offsetY", 0);
        boolean luckyMode = prefs.getBoolean("luckyMode", false);
        String bottomText = prefs.getString("customBottomText", "");
        String iconSize = prefs.getString("iconSize", "compact");
        String shapeType = prefs.getString("shapeType", "rounded-square");
        Map<String, String> customDayColors = parseCustomDayColors(prefs.getString("customDayColors", "{}"));

        // Background
        String bgImagePath = prefs.getString("backgroundImagePath", null);
        if (bgImagePath != null) {
            File bgFile = new File(bgImagePath);
            if (bgFile.exists()) {
                Bitmap bgBitmap = BitmapFactory.decodeFile(bgImagePath);
                if (bgBitmap != null) {
                    // Draw centered and scaled
                    drawSampledBitmap(canvas, bgBitmap, width, height);
                } else {
                    canvas.drawColor(Color.parseColor(bgColor));
                }
            } else {
                canvas.drawColor(Color.parseColor(bgColor));
            }
        } else {
            canvas.drawColor(Color.parseColor(bgColor));
        }

        if ("down".equals(appMode)) {
            drawCountdownHeatmap(canvas, width, height, palette, accentColor, countdownStart, countdownStartTime, countdownEnd, countdownEndTime, bgExposure, percentSize, percentDecimals, offsetY, luckyMode, bottomText, iconSize, shapeType);
        } else if ("merged".equals(viewType)) {
            drawMergedYearlyHeatmap(canvas, width, height, palette, accentColor, gridCols, offsetY, luckyMode, bottomText, iconSize, shapeType, firstDayOfWeek, customDayColors);
        } else {
            drawYearlyHeatmap(canvas, width, height, palette, accentColor, gridCols, offsetY, luckyMode, bottomText, iconSize, shapeType, firstDayOfWeek, monthLabelType, customDayColors);
        }

        return bitmap;
    }

    private void drawSampledBitmap(Canvas canvas, Bitmap bitmap, int width, int height) {
        float scale;
        float dx = 0, dy = 0;
        if (bitmap.getWidth() * height > width * bitmap.getHeight()) {
            scale = (float) height / (float) bitmap.getHeight();
            dx = (width - bitmap.getWidth() * scale) * 0.5f;
        } else {
            scale = (float) width / (float) bitmap.getWidth();
            dy = (height - bitmap.getHeight() * scale) * 0.5f;
        }
        RectF dest = new RectF(dx, dy, dx + bitmap.getWidth() * scale, dy + bitmap.getHeight() * scale);
        canvas.drawBitmap(bitmap, null, dest, new Paint(Paint.FILTER_BITMAP_FLAG));
    }

    private void sendNotification(Context context) {
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Wallpaper Updates", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("Notifications for heatmap wallpaper updates");
            notificationManager.createNotificationChannel(channel);
        }

        SimpleDateFormat sdf = new SimpleDateFormat("yyyy年M月d日", Locale.CHINESE);
        String dateStr = sdf.format(Calendar.getInstance().getTime());
        String title = dateStr + "热力图已更新";

        Intent intent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_today)
                .setContentTitle("壁纸更新成功")
                .setContentText(title)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true);

        notificationManager.notify((int) System.currentTimeMillis(), builder.build());
    }

    private Map<String, String> parseCustomDayColors(String json) {
        Map<String, String> colors = new HashMap<>();
        try {
            JSONObject object = new JSONObject(json == null ? "{}" : json);
            Iterator<String> keys = object.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                colors.put(key, object.optString(key));
            }
        } catch (Exception ignored) {}
        return colors;
    }

    private int getFirstDayIndex(String firstDayOfWeek) {
        if ("sunday".equals(firstDayOfWeek)) return 0;
        if ("monday".equals(firstDayOfWeek)) return 1;
        int localeFirstDay = Calendar.getInstance().getFirstDayOfWeek();
        return localeFirstDay == Calendar.SUNDAY ? 0 : 1;
    }

    private int getStartDayOffset(Calendar cal, String firstDayOfWeek) {
        int jsDay = cal.get(Calendar.DAY_OF_WEEK) - 1;
        int firstDay = getFirstDayIndex(firstDayOfWeek);
        return (jsDay - firstDay + 7) % 7;
    }

    private String dateKey(int year, int monthIndex, int day) {
        return String.format(Locale.US, "%04d-%02d-%02d", year, monthIndex + 1, day);
    }

    private float seededUnit(long seed) {
        return (float) (Math.abs(Math.sin(seed) * 10000.0) % 1.0);
    }

    private int safePastColor(String[] palette, boolean luckyMode, long seed) {
        float unit = seededUnit(seed);
        if (luckyMode) {
            return Color.HSVToColor(new float[]{unit * 360f, 0.8f, 0.9f});
        }
        if (palette == null || palette.length == 0) return Color.WHITE;
        int start = palette.length > 2 ? 2 : 0;
        int count = Math.max(1, palette.length - start);
        int index = start + Math.min(count - 1, (int) Math.floor(unit * Math.min(4, count)));
        try {
            return Color.parseColor(palette[index]);
        } catch (Exception e) {
            return Color.WHITE;
        }
    }

    private int safeParseColor(String color, int fallback) {
        try {
            return Color.parseColor(color);
        } catch (Exception e) {
            return fallback;
        }
    }

    private void drawYearlyHeatmap(Canvas canvas, int width, int height, String[] palette, String accent, int cols, float offsetY, boolean luckyMode, String bottomText, String iconSize, String shapeType, String firstDayOfWeek, String monthLabelType, Map<String, String> customDayColors) {
        Calendar now = Calendar.getInstance();
        int year = now.get(Calendar.YEAR);

        int rows = (int) Math.ceil(12.0 / cols);
        float cardMarginX = width * 0.08f;
        float baseCardMarginY = height * 0.35f;
        float userOffsetPixels = (offsetY / 100f) * height;
        float cardY = baseCardMarginY + userOffsetPixels;
        float cardWidth = width - 2 * cardMarginX;

        float paddingX = cardWidth * 0.06f;
        float paddingY = cardWidth * 0.08f;
        float colGap = cardWidth * 0.05f;
        float rowGap = cardWidth * 0.08f;

        float blockWidth = (cardWidth - 2 * paddingX - (cols - 1) * colGap) / cols;
        float cellSize = iconSize.equals("compact") ? blockWidth / 7.2f : blockWidth / 8.5f;
        float cellGap = iconSize.equals("compact") ? cellSize * 0.15f : cellSize * 0.4f;

        float gridWidth = 7 * cellSize + 6 * cellGap;
        float gridHeight = 6 * cellSize + 5 * cellGap;
        
        boolean showMonthLabel = !"none".equals(monthLabelType);
        float labelHeight = showMonthLabel ? cellSize * 1.4f : 0;
        float labelGap = showMonthLabel ? cellSize * 0.6f : 0;
        float blockHeight = labelHeight + labelGap + gridHeight;
        float cardHeight = 2 * paddingY + rows * blockHeight + (rows - 1) * rowGap;

        // Draw Glass Card
        Paint cardPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        cardPaint.setColor(Color.WHITE);
        cardPaint.setAlpha(25); // ~0.1 opacity
        RectF cardRect = new RectF(cardMarginX, cardY, cardMarginX + cardWidth, cardY + cardHeight);
        canvas.drawRoundRect(cardRect, 40, 40, cardPaint);

        cardPaint.setStyle(Paint.Style.STROKE);
        cardPaint.setAlpha(50);
        cardPaint.setStrokeWidth(2);
        canvas.drawRoundRect(cardRect, 40, 40, cardPaint);

        // Text Paint
        Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        textPaint.setColor(Color.WHITE);
        textPaint.setTextAlign(Paint.Align.LEFT);
        textPaint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));

        float actualColGap = cols > 1 ? (cardWidth - 2 * paddingX - gridWidth * cols) / (cols - 1) : 0;

        String[] abbrMonths = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
        String[] fullMonths = {"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"};

        for (int mIndex = 0; mIndex < 12; mIndex++) {
            int colIndex = mIndex % cols;
            int rowIndex = mIndex / cols;

            float startX = cardMarginX + paddingX + colIndex * (gridWidth + actualColGap);
            float startY = cardY + paddingY + rowIndex * (blockHeight + rowGap);

            if (showMonthLabel) {
                textPaint.setAlpha(230);
                textPaint.setTextSize(labelHeight);
                String label = "full".equals(monthLabelType) ? fullMonths[mIndex] : abbrMonths[mIndex];
                canvas.drawText(label, startX, startY + labelHeight, textPaint);
            }

            float gridStartY = startY + labelHeight + labelGap;

            Calendar cal = Calendar.getInstance();
            cal.set(year, mIndex, 1);
            int daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH);
            int startDay = getStartDayOffset(cal, firstDayOfWeek);

            for (int d = 0; d < daysInMonth; d++) {
                int dayPos = d + startDay;
                int c = dayPos % 7;
                int r = dayPos / 7;

                float x = startX + c * (cellSize + cellGap);
                float y = gridStartY + r * (cellSize + cellGap);

                Paint shapePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                
                Calendar itemDate = (Calendar) cal.clone();
                itemDate.set(Calendar.DAY_OF_MONTH, d + 1);
                String key = dateKey(year, mIndex, d + 1);
                 
                boolean isToday = itemDate.get(Calendar.DAY_OF_YEAR) == now.get(Calendar.DAY_OF_YEAR) && itemDate.get(Calendar.YEAR) == now.get(Calendar.YEAR);
                boolean isPast = itemDate.before(now);

                if (customDayColors.containsKey(key)) {
                    shapePaint.setColor(safeParseColor(customDayColors.get(key), Color.WHITE));
                } else if (isToday) {
                    shapePaint.setColor(safeParseColor(accent, Color.WHITE));
                } else if (isPast) {
                    shapePaint.setColor(safePastColor(palette, luckyMode, itemDate.getTimeInMillis()));
                } else {
                    shapePaint.setColor(Color.WHITE);
                    shapePaint.setAlpha(40);
                }

                drawPrimitive(canvas, x, y, cellSize, shapeType, shapePaint);
            }
        }

        // Bottom Text
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setAlpha(150);
        textPaint.setTextSize(cellSize * 1.5f);
        String finalLabel = bottomText.isEmpty() ? year + " Annual Heatmap" : bottomText;
        canvas.drawText(finalLabel, width / 2f, cardY + cardHeight + 60, textPaint);
    }

    private void drawMergedYearlyHeatmap(Canvas canvas, int width, int height, String[] palette, String accent, int cols, float offsetY, boolean luckyMode, String bottomText, String iconSize, String shapeType, String firstDayOfWeek, Map<String, String> customDayColors) {
        Calendar now = Calendar.getInstance();
        int year = now.get(Calendar.YEAR);
        int monthCols = Math.max(3, Math.min(4, cols));
        int monthRows = (int) Math.ceil(12.0 / monthCols);
        int totalCols = monthCols * 7;
        int totalRows = monthRows * 5;

        float cardMarginX = width * 0.08f;
        float cardY = height * 0.35f + (offsetY / 100f) * height;
        float cardWidth = width - 2 * cardMarginX;
        float paddingX = cardWidth * 0.06f;
        float paddingY = cardWidth * 0.08f;
        float gapRatio = iconSize.equals("compact") ? 0.15f : 0.4f;
        float cellSize = (cardWidth - 2 * paddingX) / (totalCols + (totalCols - 1) * gapRatio);
        float cellGap = cellSize * gapRatio;
        float gridHeight = totalRows * cellSize + (totalRows - 1) * cellGap;
        float cardHeight = 2 * paddingY + gridHeight;

        Paint cardPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        cardPaint.setColor(Color.WHITE);
        cardPaint.setAlpha(25);
        RectF cardRect = new RectF(cardMarginX, cardY, cardMarginX + cardWidth, cardY + cardHeight);
        canvas.drawRoundRect(cardRect, 40, 40, cardPaint);
        cardPaint.setStyle(Paint.Style.STROKE);
        cardPaint.setAlpha(50);
        cardPaint.setStrokeWidth(2);
        canvas.drawRoundRect(cardRect, 40, 40, cardPaint);

        float startX = cardMarginX + paddingX;
        float startY = cardY + paddingY;

        for (int mIndex = 0; mIndex < 12; mIndex++) {
            int monthCol = mIndex % monthCols;
            int monthRow = mIndex / monthCols;
            int monthOffsetX = monthCol * 7;
            int monthOffsetY = monthRow * 5;
            Calendar cal = Calendar.getInstance();
            cal.set(year, mIndex, 1);
            int daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH);
            int startDay = getStartDayOffset(cal, firstDayOfWeek);

            for (int d = 0; d < daysInMonth; d++) {
                int dayPos = d + startDay;
                int globalCol = monthOffsetX + (dayPos % 7);
                int globalRow = monthOffsetY + ((dayPos / 7) % 5);
                float x = startX + globalCol * (cellSize + cellGap);
                float y = startY + globalRow * (cellSize + cellGap);

                Paint shapePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                Calendar itemDate = (Calendar) cal.clone();
                itemDate.set(Calendar.DAY_OF_MONTH, d + 1);
                String key = dateKey(year, mIndex, d + 1);
                boolean isToday = itemDate.get(Calendar.DAY_OF_YEAR) == now.get(Calendar.DAY_OF_YEAR) && itemDate.get(Calendar.YEAR) == now.get(Calendar.YEAR);
                boolean isPast = itemDate.before(now);

                if (customDayColors.containsKey(key)) {
                    shapePaint.setColor(safeParseColor(customDayColors.get(key), Color.WHITE));
                } else if (isToday) {
                    shapePaint.setColor(safeParseColor(accent, Color.WHITE));
                } else if (isPast) {
                    shapePaint.setColor(safePastColor(palette, luckyMode, itemDate.getTimeInMillis()));
                } else {
                    shapePaint.setColor(Color.WHITE);
                    shapePaint.setAlpha(40);
                }
                drawPrimitive(canvas, x, y, cellSize, shapeType, shapePaint);
            }
        }

        if (!bottomText.isEmpty()) {
            Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            textPaint.setColor(Color.WHITE);
            textPaint.setAlpha(150);
            textPaint.setTextAlign(Paint.Align.CENTER);
            textPaint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
            textPaint.setTextSize(cellSize * 2f);
            canvas.drawText(bottomText, width / 2f, cardY + cardHeight + 60, textPaint);
        }
    }

    private Calendar parseDateTime(String date, String time, Calendar fallback) {
        Calendar cal = (Calendar) fallback.clone();
        try {
            String[] d = date.split("-");
            String[] t = time.split(":");
            cal.set(Integer.parseInt(d[0]), Integer.parseInt(d[1]) - 1, Integer.parseInt(d[2]), Integer.parseInt(t[0]), Integer.parseInt(t[1]), 0);
            cal.set(Calendar.MILLISECOND, 0);
        } catch (Exception ignored) {}
        return cal;
    }

    private void drawCountdownHeatmap(Canvas canvas, int width, int height, String[] palette, String accent, String countdownStart, String countdownStartTime, String countdownEnd, String countdownEndTime, int bgExposure, float percentSize, int percentDecimals, float offsetY, boolean luckyMode, String bottomText, String iconSize, String shapeType) {
        Calendar now = Calendar.getInstance();
        Calendar fallbackStart = Calendar.getInstance();
        Calendar fallbackEnd = Calendar.getInstance();
        fallbackEnd.add(Calendar.YEAR, 1);
        Calendar start = parseDateTime(countdownStart, countdownStartTime, fallbackStart);
        Calendar end = parseDateTime(countdownEnd, countdownEndTime, fallbackEnd);

        long dayMs = 24L * 60L * 60L * 1000L;
        long startMs = start.getTimeInMillis();
        long endMs = end.getTimeInMillis();
        long nowMs = now.getTimeInMillis();
        int totalDays = Math.max(1, (int) Math.ceil((double) (endMs - startMs) / dayMs));
        int passedDays = (int) Math.floor((double) (nowMs - startMs) / dayMs);
        double percent = endMs > startMs ? ((double) (nowMs - startMs) / (double) (endMs - startMs)) * 100.0 : 0.0;
        percent = Math.max(0.0, Math.min(100.0, percent));

        float paddingX = width * 0.04f;
        float paddingTop = height * 0.1f;
        float paddingBottom = height * 0.1f;
        float availableWidth = width - 2 * paddingX;
        float availableHeight = height - paddingTop - paddingBottom;
        float gapRatio = iconSize.equals("compact") ? 0.15f : 0.4f;
        int bestCols = 1;
        float maxCellSize = 0;
        int startSearch = Math.max(1, (int) Math.floor(Math.sqrt(totalDays * (availableWidth / availableHeight))) - 200);
        int endSearch = Math.min(totalDays, startSearch + 400);

        for (int c = startSearch; c <= endSearch; c++) {
            int rows = (int) Math.ceil((double) totalDays / c);
            float sW = availableWidth / (c + (c - 1) * gapRatio);
            float sH = availableHeight / (rows + (rows - 1) * gapRatio);
            float size = Math.min(sW, sH);
            if (size > maxCellSize) {
                maxCellSize = size;
                bestCols = c;
            }
        }

        int rows = (int) Math.ceil((double) totalDays / bestCols);
        float cellGap = maxCellSize * gapRatio;
        float gridWidth = bestCols * maxCellSize + (bestCols - 1) * cellGap;
        float gridHeight = rows * maxCellSize + (rows - 1) * cellGap;
        float startX = paddingX + (availableWidth - gridWidth) / 2f;
        float startY = paddingTop + (availableHeight - gridHeight) / 2f;

        for (int d = 0; d < totalDays; d++) {
            int col = d % bestCols;
            int row = d / bestCols;
            float x = startX + col * (maxCellSize + cellGap);
            float y = startY + row * (maxCellSize + cellGap);
            Paint shapePaint = new Paint(Paint.ANTI_ALIAS_FLAG);

            if (d == passedDays && nowMs <= endMs && nowMs >= startMs) {
                shapePaint.setColor(safeParseColor(accent, Color.WHITE));
            } else if (d < passedDays) {
                shapePaint.setColor(safePastColor(palette, luckyMode, startMs + d));
            } else {
                shapePaint.setColor(Color.WHITE);
                shapePaint.setAlpha(40);
            }
            drawPrimitive(canvas, x, y, maxCellSize, shapeType, shapePaint);
        }

        Paint overlay = new Paint();
        overlay.setColor(Color.BLACK);
        overlay.setAlpha(Math.max(0, Math.min(255, Math.round(bgExposure * 2.55f))));
        canvas.drawRect(0, 0, width, height, overlay);

        Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        textPaint.setColor(safeParseColor(accent, Color.WHITE));
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
        textPaint.setTextSize(width * 0.2f * percentSize);
        String format = "%." + Math.max(0, Math.min(4, percentDecimals)) + "f%%";
        canvas.drawText(String.format(Locale.US, format, percent), width / 2f, height / 2f + (offsetY / 100f) * height, textPaint);

        if (!bottomText.isEmpty()) {
            textPaint.setColor(Color.WHITE);
            textPaint.setAlpha(150);
            textPaint.setTextSize(width * 0.05f);
            canvas.drawText(bottomText, width / 2f, height - paddingBottom / 2f, textPaint);
        }
    }

    private void drawPrimitive(Canvas canvas, float x, float y, float size, String type, Paint paint) {
        if (type.equals("circle")) {
            canvas.drawCircle(x + size / 2, y + size / 2, size / 2, paint);
        } else if (type.equals("vertical-pill")) {
            float pillWidth = size * 0.45f;
            float left = x + (size - pillWidth) / 2f;
            canvas.drawRoundRect(new RectF(left, y, left + pillWidth, y + size), pillWidth / 2f, pillWidth / 2f, paint);
        } else if (type.equals("triangle")) {
            android.graphics.Path path = new android.graphics.Path();
            path.moveTo(x + size / 2, y);
            path.lineTo(x + size, y + size);
            path.lineTo(x, y + size);
            path.close();
            canvas.drawPath(path, paint);
        } else if (type.equals("square")) {
            canvas.drawRect(x, y, x + size, y + size, paint);
        } else {
            canvas.drawRoundRect(new RectF(x, y, x + size, y + size), size * 0.2f, size * 0.2f, paint);
        }
    }
}
