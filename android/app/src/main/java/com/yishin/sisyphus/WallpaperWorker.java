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
import java.util.Random;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import androidx.core.app.NotificationCompat;
import java.text.SimpleDateFormat;
import java.util.Locale;

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
        SharedPreferences prefs = context.getSharedPreferences("HeatmapSettings", Context.MODE_PRIVATE);

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
        int gridCols = prefs.getInt("gridCols", 4);
        float offsetY = prefs.getFloat("offsetY", 0);
        boolean luckyMode = prefs.getBoolean("luckyMode", false);
        String bottomText = prefs.getString("customBottomText", "");
        String iconSize = prefs.getString("iconSize", "compact");
        String shapeType = prefs.getString("shapeType", "rounded-square");

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

        // Draw Heatmap Card
        drawYearlyHeatmap(canvas, width, height, palette, accentColor, gridCols, offsetY, luckyMode, bottomText, iconSize, shapeType);

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

    private void drawYearlyHeatmap(Canvas canvas, int width, int height, String[] palette, String accent, int cols, float offsetY, boolean luckyMode, String bottomText, String iconSize, String shapeType) {
        Calendar now = Calendar.getInstance();
        int year = now.get(Calendar.YEAR);
        Random random = new Random();

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
        
        float labelHeight = cellSize * 1.4f;
        float labelGap = cellSize * 0.6f;
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

        String[] months = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};

        for (int mIndex = 0; mIndex < 12; mIndex++) {
            int colIndex = mIndex % cols;
            int rowIndex = mIndex / cols;

            float startX = cardMarginX + paddingX + colIndex * (gridWidth + actualColGap);
            float startY = cardY + paddingY + rowIndex * (blockHeight + rowGap);

            // Month Label
            textPaint.setAlpha(230);
            textPaint.setTextSize(labelHeight);
            canvas.drawText(months[mIndex], startX, startY + labelHeight, textPaint);

            float gridStartY = startY + labelHeight + labelGap;

            Calendar cal = Calendar.getInstance();
            cal.set(year, mIndex, 1);
            int daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH);
            int startDay = (cal.get(Calendar.DAY_OF_WEEK) + 5) % 7; // Monday start

            for (int d = 0; d < daysInMonth; d++) {
                int dayPos = d + startDay;
                int c = dayPos % 7;
                int r = dayPos / 7;

                float x = startX + c * (cellSize + cellGap);
                float y = gridStartY + r * (cellSize + cellGap);

                Paint shapePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                
                Calendar itemDate = (Calendar) cal.clone();
                itemDate.set(Calendar.DAY_OF_MONTH, d + 1);
                
                boolean isToday = itemDate.get(Calendar.DAY_OF_YEAR) == now.get(Calendar.DAY_OF_YEAR) && itemDate.get(Calendar.YEAR) == now.get(Calendar.YEAR);
                boolean isPast = itemDate.before(now);

                if (isToday) {
                    shapePaint.setColor(Color.parseColor(accent));
                } else if (isPast) {
                    if (luckyMode) {
                        shapePaint.setColor(Color.HSVToColor(new float[]{random.nextInt(360), 0.8f, 0.9f}));
                    } else {
                        int idx = random.nextInt(4) + 2;
                        shapePaint.setColor(Color.parseColor(palette[idx]));
                    }
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

    private void drawPrimitive(Canvas canvas, float x, float y, float size, String type, Paint paint) {
        if (type.equals("circle")) {
            canvas.drawCircle(x + size / 2, y + size / 2, size / 2, paint);
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
