package com.yishin.sisyphus;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import java.util.Calendar;
import java.util.concurrent.TimeUnit;

public final class WallpaperScheduler {
    public static final String PREFS_NAME = "HeatmapSettings";
    private static final String IMMEDIATE_WORK_NAME = "ImmediateWallpaperUpdate";
    private static final String PERIODIC_WORK_NAME = "DailyWallpaperUpdate";

    private WallpaperScheduler() {}

    public static void scheduleFromPrefs(Context context, boolean runImmediately) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        if (!prefs.getBoolean("autoUpdateEnabled", false)) {
            cancel(context);
            return;
        }

        schedule(
                context,
                prefs.getString("appMode", "push"),
                prefs.getInt("refreshInterval", 1440),
                runImmediately
        );
    }

    public static void schedule(Context context, String appMode, int refreshInterval, boolean runImmediately) {
        WorkManager workManager = WorkManager.getInstance(context);
        workManager.cancelUniqueWork(IMMEDIATE_WORK_NAME);
        workManager.cancelUniqueWork(PERIODIC_WORK_NAME);

        if (runImmediately) {
            OneTimeWorkRequest immediateWork = new OneTimeWorkRequest.Builder(WallpaperWorker.class).build();
            workManager.enqueueUniqueWork(
                    IMMEDIATE_WORK_NAME,
                    ExistingWorkPolicy.REPLACE,
                    immediateWork
            );
        }

        long delay;
        long intervalMinutes;
        if ("down".equals(appMode)) {
            intervalMinutes = Math.max(15, refreshInterval);
            delay = TimeUnit.MINUTES.toMillis(intervalMinutes);
        } else {
            intervalMinutes = 24 * 60;
            Calendar nextMidnight = Calendar.getInstance();
            nextMidnight.add(Calendar.DAY_OF_YEAR, 1);
            nextMidnight.set(Calendar.HOUR_OF_DAY, 0);
            nextMidnight.set(Calendar.MINUTE, 0);
            nextMidnight.set(Calendar.SECOND, 0);
            nextMidnight.set(Calendar.MILLISECOND, 0);
            delay = Math.max(0, nextMidnight.getTimeInMillis() - System.currentTimeMillis());
        }

        PeriodicWorkRequest workRequest = new PeriodicWorkRequest.Builder(WallpaperWorker.class, intervalMinutes, TimeUnit.MINUTES)
                .setInitialDelay(delay, TimeUnit.MILLISECONDS)
                .build();

        workManager.enqueueUniquePeriodicWork(
                PERIODIC_WORK_NAME,
                ExistingPeriodicWorkPolicy.REPLACE,
                workRequest
        );
    }

    public static void cancel(Context context) {
        WorkManager workManager = WorkManager.getInstance(context);
        workManager.cancelUniqueWork(IMMEDIATE_WORK_NAME);
        workManager.cancelUniqueWork(PERIODIC_WORK_NAME);
    }
}
