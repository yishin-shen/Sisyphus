package com.yishin.sisyphus;

import android.app.Activity;
import android.app.WallpaperManager;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Rect;
import android.net.Uri;
import androidx.palette.graphics.Palette;
import java.util.ArrayList;
import java.util.List;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.view.WindowMetrics;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;
import androidx.core.graphics.ColorUtils;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.material.datepicker.MaterialDatePicker;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.OneTimeWorkRequest;
import androidx.work.ExistingWorkPolicy;
import java.util.concurrent.TimeUnit;
import java.util.Calendar;
import android.content.SharedPreferences;
import android.content.Context;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(name = "Wallpaper")
public class WallpaperPlugin extends Plugin {

    @PluginMethod
    public void getColorsFromImage(PluginCall call) {
        String imageBase64 = call.getString("imageBase64");
        if (imageBase64 == null || imageBase64.isEmpty()) {
            call.reject("imageBase64 is required.");
            return;
        }

        try {
            byte[] decodedBytes = Base64.decode(imageBase64, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
            if (bitmap == null) {
                call.reject("Failed to decode image.");
                return;
            }

            Palette.from(bitmap).generate(palette -> {
                if (palette == null) {
                    call.reject("Failed to extract palette.");
                    return;
                }

                // 核心算法：基于 Android Palette 生成符合 MD3 感官的配色
                int seed = palette.getDominantColor(0xFF001d35);
                int vibrant = palette.getVibrantColor(seed);
                
                // 1. 生成深色背景 (基于主色调进行极暗混合)
                int backgroundColor = ColorUtils.blendARGB(vibrant, Color.BLACK, 0.92f);
                
                // 2. 生成主色 (调高亮度)
                int primary = ColorUtils.blendARGB(vibrant, Color.WHITE, 0.2f);
                
                // 3. 生成 6 阶热力图色板 (从背景色平滑过渡到主色)
                List<String> heatmapPalette = new ArrayList<>();
                heatmapPalette.add(hexColor(ColorUtils.blendARGB(backgroundColor, primary, 0.15f)));
                heatmapPalette.add(hexColor(ColorUtils.blendARGB(backgroundColor, primary, 0.35f)));
                heatmapPalette.add(hexColor(ColorUtils.blendARGB(backgroundColor, primary, 0.55f)));
                heatmapPalette.add(hexColor(ColorUtils.blendARGB(backgroundColor, primary, 0.75f)));
                heatmapPalette.add(hexColor(primary));
                heatmapPalette.add(hexColor(ColorUtils.blendARGB(primary, Color.WHITE, 0.4f)));

                JSObject result = new JSObject();
                result.put("background", hexColor(backgroundColor));
                result.put("primary", hexColor(primary));
                result.put("accent", hexColor(primary));
                result.put("heatmapPalette", String.join(",", heatmapPalette));
                
                call.resolve(result);
            });
        } catch (Exception e) {
            call.reject("Error extracting colors: " + e.getMessage());
        }
    }

    private String hexColor(int color) {
        return String.format("#%06X", (0xFFFFFF & color));
    }

    @PluginMethod
    public void setBackgroundImage(PluginCall call) {
        String imageBase64 = call.getString("imageBase64");
        if (imageBase64 == null) {
            SharedPreferences prefs = getContext().getSharedPreferences("HeatmapSettings", Context.MODE_PRIVATE);
            prefs.edit().remove("backgroundImagePath").apply();
            call.resolve();
            return;
        }

        try {
            byte[] decodedBytes = Base64.decode(imageBase64, Base64.DEFAULT);
            File file = new File(getContext().getFilesDir(), "heatmap_bg.png");
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(decodedBytes);
            }

            SharedPreferences prefs = getContext().getSharedPreferences("HeatmapSettings", Context.MODE_PRIVATE);
            prefs.edit().putString("backgroundImagePath", file.getAbsolutePath()).apply();

            JSObject result = new JSObject();
            result.put("path", file.getAbsolutePath());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to save background image: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getScreenResolution(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is unavailable.");
            return;
        }

        int width;
        int height;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowMetrics metrics = activity.getWindowManager().getCurrentWindowMetrics();
            Rect bounds = metrics.getBounds();
            width = bounds.width();
            height = bounds.height();
        } else {
            DisplayMetrics metrics = new DisplayMetrics();
            activity.getWindowManager().getDefaultDisplay().getRealMetrics(metrics);
            width = metrics.widthPixels;
            height = metrics.heightPixels;
        }

        JSObject result = new JSObject();
        result.put("width", width);
        result.put("height", height);
        call.resolve(result);
    }

    @PluginMethod
    public void setLockScreenWallpaper(PluginCall call) {
        String imageBase64 = call.getString("imageBase64");
        if (imageBase64 == null || imageBase64.isEmpty()) {
            call.reject("imageBase64 is required.");
            return;
        }

        // Save settings for background worker
        saveSettings(call);

        byte[] decodedBytes = Base64.decode(imageBase64, Base64.DEFAULT);

        try {
            File cacheDir = getContext().getCacheDir();
            File tempFile = new File(cacheDir, "temp_wallpaper.png");
            try (FileOutputStream fos = new FileOutputStream(tempFile)) {
                fos.write(decodedBytes);
            }

            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", tempFile);

            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                try {
                    intent = WallpaperManager.getInstance(getContext()).getCropAndSetWallpaperIntent(uri);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    getActivity().startActivity(intent);
                } catch (Exception e) {
                    showChooser(uri);
                }
            } else {
                showChooser(uri);
            }

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (IOException exception) {
            call.reject("Failed to process wallpaper image.", exception);
        } catch (Exception exception) {
            call.reject("Unexpected error.", exception);
        }
    }

    private void showChooser(Uri uri) {
        Intent intent = new Intent(Intent.ACTION_ATTACH_DATA);
        intent.addCategory(Intent.CATEGORY_DEFAULT);
        intent.setDataAndType(uri, "image/png");
        intent.putExtra("mimeType", "image/png");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        Intent chooserIntent = Intent.createChooser(intent, "Set as Wallpaper");
        chooserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(chooserIntent);
    }

    @PluginMethod
    public void getSystemColors(PluginCall call) {
        JSObject result = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Activity activity = getActivity();
            if (activity != null) {
                try {
                    int accent1 = activity.getResources().getColor(android.R.color.system_accent1_500, activity.getTheme());
                    int accent2 = activity.getResources().getColor(android.R.color.system_accent2_500, activity.getTheme());
                    int accent3 = activity.getResources().getColor(android.R.color.system_accent3_500, activity.getTheme());
                    int neutral1 = activity.getResources().getColor(android.R.color.system_neutral1_900, activity.getTheme());
                    result.put("accent1", String.format("#%06X", (0xFFFFFF & accent1)));
                    result.put("accent2", String.format("#%06X", (0xFFFFFF & accent2)));
                    result.put("accent3", String.format("#%06X", (0xFFFFFF & accent3)));
                    result.put("neutral1", String.format("#%06X", (0xFFFFFF & neutral1)));
                } catch (Exception e) {
                    // Ignore
                }
            }
        }
        call.resolve(result);
    }

    @PluginMethod
    public void saveToGallery(PluginCall call) {
        String imageBase64 = call.getString("imageBase64");
        if (imageBase64 == null || imageBase64.isEmpty()) {
            call.reject("imageBase64 is required.");
            return;
        }

        byte[] decodedBytes = Base64.decode(imageBase64, Base64.DEFAULT);
        Bitmap bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
        if (bitmap == null) {
            call.reject("Failed to decode image.");
            return;
        }

        try {
            String filename = "sisyphus_" + System.currentTimeMillis() + ".png";
            OutputStream fos;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                values.put(MediaStore.MediaColumns.MIME_TYPE, "image/png");
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES);

                Uri imageUri = getContext().getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (imageUri == null) {
                    throw new IOException("Failed to create MediaStore record.");
                }
                fos = getContext().getContentResolver().openOutputStream(imageUri);
            } else {
                File imagesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
                if (!imagesDir.exists() && !imagesDir.mkdirs()) {
                    throw new IOException("Failed to create Pictures directory.");
                }
                File imageFile = new File(imagesDir, filename);
                fos = new FileOutputStream(imageFile);
            }

            if (fos != null) {
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos);
                fos.close();
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            } else {
                call.reject("Failed to open output stream.");
            }
        } catch (Exception e) {
            call.reject("Failed to save image to gallery.", e);
        }
    }

    @PluginMethod
    public void pickDate(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            MaterialDatePicker<Long> datePicker = MaterialDatePicker.Builder.datePicker()
                    .setTitleText("Select Date")
                    .build();
            final boolean[] isResolved = {false};
            datePicker.addOnPositiveButtonClickListener(selection -> {
                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US);
                sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
                String formatted = sdf.format(new java.util.Date(selection));
                JSObject ret = new JSObject();
                ret.put("date", formatted);
                isResolved[0] = true;
                call.resolve(ret);
            });
            datePicker.addOnCancelListener(dialog -> {
                if (!isResolved[0]) {
                    isResolved[0] = true;
                    call.reject("cancelled");
                }
            });
            datePicker.addOnDismissListener(dialog -> {
                if (!isResolved[0]) {
                    isResolved[0] = true;
                    call.reject("dismissed");
                }
            });
            datePicker.show(((AppCompatActivity) getActivity()).getSupportFragmentManager(), "DATE_PICKER");
        });
    }

    @PluginMethod
    public void pickTime(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            com.google.android.material.timepicker.MaterialTimePicker timePicker = new com.google.android.material.timepicker.MaterialTimePicker.Builder()
                    .setTimeFormat(com.google.android.material.timepicker.TimeFormat.CLOCK_24H)
                    .setInputMode(com.google.android.material.timepicker.MaterialTimePicker.INPUT_MODE_CLOCK)
                    .setTitleText("Select Time")
                    .build();
            final boolean[] isResolved = {false};
            timePicker.addOnPositiveButtonClickListener(dialog -> {
                int hour = timePicker.getHour();
                int minute = timePicker.getMinute();
                String formatted = String.format(java.util.Locale.US, "%02d:%02d", hour, minute);
                JSObject ret = new JSObject();
                ret.put("time", formatted);
                isResolved[0] = true;
                call.resolve(ret);
            });
            timePicker.addOnCancelListener(dialog -> {
                if (!isResolved[0]) {
                    isResolved[0] = true;
                    call.reject("cancelled");
                }
            });
            timePicker.addOnDismissListener(dialog -> {
                if (!isResolved[0]) {
                    isResolved[0] = true;
                    call.reject("dismissed");
                }
            });
            timePicker.show(((AppCompatActivity) getActivity()).getSupportFragmentManager(), "TIME_PICKER");
        });
    }

    private void saveSettings(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences("HeatmapSettings", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        Activity activity = getActivity();
        if (activity != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Rect bounds = activity.getWindowManager().getCurrentWindowMetrics().getBounds();
                editor.putInt("screenWidth", bounds.width());
                editor.putInt("screenHeight", bounds.height());
            } else {
                DisplayMetrics metrics = new DisplayMetrics();
                activity.getWindowManager().getDefaultDisplay().getRealMetrics(metrics);
                editor.putInt("screenWidth", metrics.widthPixels);
                editor.putInt("screenHeight", metrics.heightPixels);
            }
        }

        JSObject settings = call.getObject("settings");
        if (settings != null) {
            editor.putString("bg", settings.getString("bg", "#001d35"));
            editor.putString("accent", settings.getString("accent", "#7cc0ff"));
            editor.putString("colors", settings.getString("colors", ""));
            editor.putInt("gridCols", settings.getInteger("gridCols", 4));
            editor.putFloat("offsetY", (float) settings.optDouble("offsetY", 0.0));
            editor.putBoolean("luckyMode", settings.getBoolean("luckyMode", false));
            editor.putString("customBottomText", settings.getString("customBottomText", ""));
            editor.putString("iconSize", settings.getString("iconSize", "compact"));
            editor.putString("shapeType", settings.getString("shapeType", "rounded-square"));
            editor.putBoolean("autoUpdateEnabled", settings.getBoolean("autoUpdateEnabled", false));
            editor.apply();

            if (settings.getBoolean("autoUpdateEnabled", false)) {
                scheduleWallpaperUpdate();
            } else {
                WorkManager.getInstance(getContext()).cancelUniqueWork("DailyWallpaperUpdate");
            }
        }
    }

    private void scheduleWallpaperUpdate() {
        OneTimeWorkRequest immediateWork = new OneTimeWorkRequest.Builder(WallpaperWorker.class).build();
        WorkManager.getInstance(getContext()).enqueueUniqueWork(
                "ImmediateWallpaperUpdate",
                ExistingWorkPolicy.REPLACE,
                immediateWork
        );

        Calendar nextMidnight = Calendar.getInstance();
        nextMidnight.add(Calendar.DAY_OF_YEAR, 1);
        nextMidnight.set(Calendar.HOUR_OF_DAY, 0);
        nextMidnight.set(Calendar.MINUTE, 0);
        nextMidnight.set(Calendar.SECOND, 0);
        nextMidnight.set(Calendar.MILLISECOND, 0);

        long delay = nextMidnight.getTimeInMillis() - System.currentTimeMillis();

        PeriodicWorkRequest workRequest = new PeriodicWorkRequest.Builder(WallpaperWorker.class, 24, TimeUnit.HOURS)
                .setInitialDelay(delay, TimeUnit.MILLISECONDS)
                .build();

        WorkManager.getInstance(getContext()).enqueueUniquePeriodicWork(
                "DailyWallpaperUpdate",
                ExistingPeriodicWorkPolicy.REPLACE,
                workRequest
        );
    }

    @PluginMethod
    public void pickColor(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            android.content.Context context = getContext();
            android.widget.LinearLayout layout = new android.widget.LinearLayout(context);
            layout.setOrientation(android.widget.LinearLayout.VERTICAL);
            int padding = (int) (24 * context.getResources().getDisplayMetrics().density);
            layout.setPadding(padding, padding, padding, padding);

            com.google.android.material.textfield.TextInputLayout textInputLayout = new com.google.android.material.textfield.TextInputLayout(context);
            textInputLayout.setHint("Hex Color (e.g. #34D399)");

            com.google.android.material.textfield.TextInputEditText editText = new com.google.android.material.textfield.TextInputEditText(context);
            editText.setText(call.getString("current", "#34D399"));
            editText.setMaxLines(1);
            editText.setSingleLine(true);

            textInputLayout.addView(editText);
            layout.addView(textInputLayout);

            new MaterialAlertDialogBuilder(context)
                    .setTitle("Select Color")
                    .setView(layout)
                    .setPositiveButton("OK", (dialog, which) -> {
                        String hex = editText.getText() != null ? editText.getText().toString().trim() : "";
                        if (!hex.startsWith("#")) hex = "#" + hex;
                        try {
                            android.graphics.Color.parseColor(hex);
                            JSObject ret = new JSObject();
                            ret.put("color", hex);
                            call.resolve(ret);
                        } catch (Exception e) {
                            call.reject("Invalid color format.");
                        }
                    })
                    .setNegativeButton("Cancel", (dialog, which) -> call.reject("cancelled"))
                    .show();
        });
    }
}
