package com.gslaucher.tv

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import java.io.File

class TVAppManagerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TVAppManager"

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val myPackage = reactContext.packageName
            val appList = Arguments.createArray()

            val tvIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER)
            val tvApps = pm.queryIntentActivities(tvIntent, 0)

            val standardIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            val standardApps = pm.queryIntentActivities(standardIntent, 0)

            val seenPackages = mutableSetOf<String>()
            seenPackages.add(myPackage)

            val allActivities = tvApps + standardApps
            for (resolveInfo in allActivities) {
                val pkgName = resolveInfo.activityInfo.packageName
                if (pkgName !in seenPackages) {
                    seenPackages.add(pkgName)
                    val label = resolveInfo.loadLabel(pm).toString()
                    val item = Arguments.createMap()
                    item.putString("name", label)
                    item.putString("packageName", pkgName)
                    appList.pushMap(item)
                }
            }

            promise.resolve(appList)
        } catch (e: Exception) {
            promise.reject("ERROR_GET_APPS", e.message, e)
        }
    }

    @ReactMethod
    fun launchApp(packageName: String, promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val intent = pm.getLeanbackLaunchIntentForPackage(packageName)
                ?: pm.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("ERROR_LAUNCH", e.message, e)
        }
    }

    @ReactMethod
    fun installUpdate(downloadUrl: String, promise: Promise) {
        try {
            val destination = File(
                reactContext.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS),
                "update.apk"
            )
            if (destination.exists()) {
                destination.delete()
            }

            val request = DownloadManager.Request(Uri.parse(downloadUrl))
                .setTitle("GS Launcher Güncelleniyor")
                .setDescription("Yeni sürüm indiriliyor...")
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
                .setDestinationUri(Uri.fromFile(destination))

            val dm = reactContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            val downloadId = dm.enqueue(request)

            val receiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    val id = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)
                    if (id == downloadId) {
                        try {
                            reactContext.unregisterReceiver(this)
                        } catch (_: Exception) {}

                        if (destination.exists()) {
                            val apkUri = FileProvider.getUriForFile(
                                reactContext,
                                "${reactContext.packageName}.provider",
                                destination
                            )
                            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                                setDataAndType(apkUri, "application/vnd.android.package-archive")
                                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            reactContext.startActivity(installIntent)
                        }
                    }
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactContext.registerReceiver(
                    receiver,
                    IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
                    Context.RECEIVER_EXPORTED
                )
            } else {
                reactContext.registerReceiver(
                    receiver,
                    IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
                )
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_INSTALL", e.message, e)
        }
    }

    @ReactMethod
    fun openSettings(promise: Promise) {
        try {
            val intent = Intent(android.provider.Settings.ACTION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_SETTINGS", e.message, e)
        }
    }

    @ReactMethod
    fun openWifiSettings(promise: Promise) {
        try {
            val intent = Intent(android.provider.Settings.ACTION_WIFI_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_WIFI", e.message, e)
        }
    }

    @ReactMethod
    fun openAppDetails(packageName: String, promise: Promise) {
        try {
            val intent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$packageName")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_APP_DETAILS", e.message, e)
        }
    }

    @ReactMethod
    fun openVoiceSearch(promise: Promise) {
        try {
            val intent = Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            try {
                val searchIntent = Intent(Intent.ACTION_WEB_SEARCH).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(searchIntent)
                promise.resolve(true)
            } catch (err: Exception) {
                promise.reject("ERROR_VOICE", err.message, err)
            }
        }
    }

    @ReactMethod
    fun openLiveChannels(promise: Promise) {
        try {
            // 1. Android TvContract Intent (Dahili Uydu Tuner & Canlı TV Kanalları)
            val tvIntent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("content://android.media.tv/channel")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            if (tvIntent.resolveActivity(reactContext.packageManager) != null) {
                reactContext.startActivity(tvIntent)
                promise.resolve(true)
                return
            }
        } catch (e: Exception) {}

        // 2. Android TV / Xiaomi TV / Google TV Canlı TV Paketleri
        val liveTvPackages = listOf(
            "com.google.android.tv",               // Google Live Channels
            "com.android.tv",                      // AOSP Live TV / Tuner
            "com.mitv.tvhome",                     // Xiaomi Mi TV Canlı TV
            "com.xiaomi.mitv.tvbox.launcher",
            "com.xiaomi.mitv.mediaexplorer",
            "ar.tvplayer.tv",                      // TiviMate
            "com.tivimate.player"
        )

        for (pkg in liveTvPackages) {
            try {
                val launchIntent = reactContext.packageManager.getLeanbackLaunchIntentForPackage(pkg)
                    ?: reactContext.packageManager.getLaunchIntentForPackage(pkg)
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    reactContext.startActivity(launchIntent)
                    promise.resolve(true)
                    return
                }
            } catch (ignored: Exception) {}
        }

        // 3. TV Girişleri (TV Input Switcher - Uydu / HDMI Girişi)
        try {
            val inputIntent = Intent("android.media.tv.action.VIEW_INPUTS").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            if (inputIntent.resolveActivity(reactContext.packageManager) != null) {
                reactContext.startActivity(inputIntent)
                promise.resolve(true)
                return
            }
        } catch (e: Exception) {}

        // 4. Standart TV Ayarları
        try {
            val settings = Intent(android.provider.Settings.ACTION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(settings)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_LIVE_TV", "Canlı TV alıcısı açılamadı: " + e.message)
        }
    }

    @ReactMethod
    fun openTVInputs(promise: Promise) {
        try {
            val inputIntent = Intent("android.media.tv.action.VIEW_INPUTS").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            if (inputIntent.resolveActivity(reactContext.packageManager) != null) {
                reactContext.startActivity(inputIntent)
                promise.resolve(true)
                return
            }
        } catch (e: Exception) {}

        try {
            val settings = Intent(android.provider.Settings.ACTION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(settings)
            promise.resolve(true)
        } catch (err: Exception) {
            promise.reject("ERROR_INPUTS", err.message, err)
        }
    }

    @ReactMethod
    fun getBatteryLevel(promise: Promise) {
        try {
            val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            val batteryStatus = reactContext.registerReceiver(null, filter)
            val level = batteryStatus?.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale = batteryStatus?.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, -1) ?: -1
            val batteryPct = if (level != -1 && scale != -1) (level * 100 / scale.toFloat()).toInt() else 92
            promise.resolve(batteryPct)
        } catch (e: Exception) {
            promise.resolve(92)
        }
    }

    @ReactMethod
    fun openBluetoothSettings(promise: Promise) {
        try {
            val intent = Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_BT", e.message, e)
        }
    }

    @ReactMethod
    fun openFileManager(promise: Promise) {
        val fileManagers = listOf(
            "com.xiaomi.mitv.mediaexplorer",
            "com.lonelycatgames.Xplore",
            "com.estrongs.android.pop",
            "com.ghisler.android.TotalCommander",
            "com.android.documentsui"
        )
        for (pkg in fileManagers) {
            val intent = reactContext.packageManager.getLeanbackLaunchIntentForPackage(pkg)
                ?: reactContext.packageManager.getLaunchIntentForPackage(pkg)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(intent)
                promise.resolve(true)
                return
            }
        }
        try {
            val viewIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(Uri.parse("content://media/external/file"), "*/*")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(viewIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_FILES", "Dosya yöneticisi bulunamadı.")
        }
    }

    @ReactMethod
    fun getDeviceInfo(promise: Promise) {
        try {
            val map = Arguments.createMap()
            map.putString("manufacturer", Build.MANUFACTURER)
            map.putString("model", Build.MODEL)
            map.putString("brand", Build.BRAND)
            map.putString("device", Build.DEVICE)
            map.putString("androidVersion", Build.VERSION.RELEASE)
            map.putInt("sdkInt", Build.VERSION.SDK_INT)
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERROR_DEVICE_INFO", e.message, e)
        }
    }
}
