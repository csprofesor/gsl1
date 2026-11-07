package com.gslaucher.tv

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.Environment
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileOutputStream

class TVAppManagerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TVAppManager"

    private fun drawableToBitmap(drawable: Drawable): Bitmap {
        if (drawable is BitmapDrawable && drawable.bitmap != null) {
            return drawable.bitmap
        }
        val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 128
        val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 128
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        return bitmap
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        Thread {
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

                val iconsDir = File(reactContext.filesDir, "app_icons")
                if (!iconsDir.exists()) {
                    iconsDir.mkdirs()
                }

                val allActivities = tvApps + standardApps
                for (resolveInfo in allActivities) {
                    val pkgName = resolveInfo.activityInfo.packageName
                    if (pkgName !in seenPackages) {
                        seenPackages.add(pkgName)
                        val label = resolveInfo.loadLabel(pm).toString()
                        val item = Arguments.createMap()
                        item.putString("name", label)
                        item.putString("packageName", pkgName)

                        // Gerçek Uygulama İkonunu Çıkar ve Kaydet
                        try {
                            val iconFile = File(iconsDir, "$pkgName.png")
                            if (!iconFile.exists() || iconFile.length() == 0L) {
                                val iconDrawable = resolveInfo.loadIcon(pm)
                                val bmp = drawableToBitmap(iconDrawable)
                                FileOutputStream(iconFile).use { out ->
                                    bmp.compress(Bitmap.CompressFormat.PNG, 90, out)
                                }
                            }
                            if (iconFile.exists() && iconFile.length() > 0) {
                                item.putString("iconUri", "file://${iconFile.absolutePath}")
                            }
                        } catch (_: Exception) {}

                        // Android TV Banner'ı varsa onu da al
                        try {
                            val bannerDrawable = resolveInfo.activityInfo.loadBanner(pm)
                            if (bannerDrawable != null) {
                                val bannerFile = File(iconsDir, "${pkgName}_banner.png")
                                if (!bannerFile.exists() || bannerFile.length() == 0L) {
                                    val bmp = drawableToBitmap(bannerDrawable)
                                    FileOutputStream(bannerFile).use { out ->
                                        bmp.compress(Bitmap.CompressFormat.PNG, 90, out)
                                    }
                                }
                                if (bannerFile.exists() && bannerFile.length() > 0) {
                                    item.putString("bannerUri", "file://${bannerFile.absolutePath}")
                                }
                            }
                        } catch (_: Exception) {}

                        appList.pushMap(item)
                    }
                }

                promise.resolve(appList)
            } catch (e: Exception) {
                promise.reject("ERROR_GET_APPS", e.message, e)
            }
        }.start()
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
    fun launchMediaContent(
        packageName: String?,
        query: String?,
        uriString: String?,
        promise: Promise
    ) {
        try {
            val pm = reactContext.packageManager

            // 1. Derin Link (URI) Doğrudan Oynatma / Arama
            if (!uriString.isNullOrEmpty()) {
                try {
                    val uriIntent = Intent(Intent.ACTION_VIEW, Uri.parse(uriString)).apply {
                        if (!packageName.isNullOrEmpty()) {
                            setPackage(packageName)
                        }
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    if (uriIntent.resolveActivity(pm) != null) {
                        reactContext.startActivity(uriIntent)
                        promise.resolve(true)
                        return
                    }
                } catch (_: Exception) {}

                // Belirtilen paketle açılamadıysa sistemdeki herhangi bir oynatıcı ile dene
                try {
                    val genericUriIntent = Intent(Intent.ACTION_VIEW, Uri.parse(uriString)).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    if (genericUriIntent.resolveActivity(pm) != null) {
                        reactContext.startActivity(genericUriIntent)
                        promise.resolve(true)
                        return
                    }
                } catch (_: Exception) {}
            }

            // 2. Uygulama İçi Doğrudan Arama ve Film Başlatma Intent'leri
            if (!query.isNullOrEmpty()) {
                val pkg = packageName?.lowercase() ?: ""

                // Cloudstream için özel arama deep-link
                if (pkg.contains("cloudstream")) {
                    try {
                        val csIntent = Intent(Intent.ACTION_VIEW, Uri.parse("cloudstream3://search?query=" + Uri.encode(query))).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        reactContext.startActivity(csIntent)
                        promise.resolve(true)
                        return
                    } catch (_: Exception) {}
                }

                // Stremio için özel arama deep-link
                if (pkg.contains("stremio")) {
                    try {
                        val strmIntent = Intent(Intent.ACTION_VIEW, Uri.parse("stremio:///search?query=" + Uri.encode(query))).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        reactContext.startActivity(strmIntent)
                        promise.resolve(true)
                        return
                    } catch (_: Exception) {}
                }

                // Netflix için özel arama deep-link
                if (pkg.contains("netflix")) {
                    try {
                        val nflxIntent = Intent(Intent.ACTION_VIEW, Uri.parse("nflx://www.netflix.com/search?q=" + Uri.encode(query))).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        reactContext.startActivity(nflxIntent)
                        promise.resolve(true)
                        return
                    } catch (_: Exception) {}
                }

                // Standart Android TV Media / Search Intent
                if (!packageName.isNullOrEmpty()) {
                    val searchIntent = Intent(Intent.ACTION_SEARCH).apply {
                        setPackage(packageName)
                        putExtra("query", query)
                        putExtra(android.app.SearchManager.QUERY, query)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    if (searchIntent.resolveActivity(pm) != null) {
                        reactContext.startActivity(searchIntent)
                        promise.resolve(true)
                        return
                    }
                }
            }

            // 3. Fallback: Hedef Uygulamayı Aç (query argümanı ile)
            if (!packageName.isNullOrEmpty()) {
                val launchIntent = pm.getLeanbackLaunchIntentForPackage(packageName)
                    ?: pm.getLaunchIntentForPackage(packageName)
                if (launchIntent != null) {
                    if (!query.isNullOrEmpty()) {
                        launchIntent.putExtra("query", query)
                        launchIntent.putExtra(android.app.SearchManager.QUERY, query)
                    }
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    reactContext.startActivity(launchIntent)
                    promise.resolve(true)
                    return
                }
            }

            // 4. Son Çare: YouTube veya Web Üzerinde Filmi Aç
            if (!query.isNullOrEmpty()) {
                val ytUrl = "https://www.youtube.com/results?search_query=" + Uri.encode(query + " film izle")
                val ytIntent = Intent(Intent.ACTION_VIEW, Uri.parse(ytUrl)).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(ytIntent)
                promise.resolve(true)
                return
            }

            promise.resolve(false)
        } catch (e: Exception) {
            promise.reject("ERROR_MEDIA_LAUNCH", e.message, e)
        }
    }

    @ReactMethod
    fun openStockLauncher(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val myPackage = reactContext.packageName

            // Bilinen orijinal Android TV / Mi Box / Google TV / Fire TV başlatıcıları
            val stockPackages = listOf(
                "com.google.android.tvlauncher",
                "com.google.android.apps.tv.launcherx",
                "com.mitv.tvhome",
                "com.xiaomi.mitv.tvbox.launcher",
                "com.amazon.firehomelauncher",
                "com.android.launcher3",
                "com.android.launcher"
            )

            for (pkg in stockPackages) {
                if (pkg != myPackage) {
                    val launchIntent = pm.getLeanbackLaunchIntentForPackage(pkg)
                        ?: pm.getLaunchIntentForPackage(pkg)
                    if (launchIntent != null) {
                        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        reactContext.startActivity(launchIntent)
                        promise.resolve(true)
                        return
                    }
                }
            }

            // Sistemdeki diğer HOME intent sahiplerini sorgula
            val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            val homeActivities = pm.queryIntentActivities(homeIntent, 0)
            for (resolveInfo in homeActivities) {
                val pkg = resolveInfo.activityInfo.packageName
                if (pkg != myPackage) {
                    val intent = Intent(Intent.ACTION_MAIN).apply {
                        addCategory(Intent.CATEGORY_HOME)
                        setClassName(pkg, resolveInfo.activityInfo.name)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactContext.startActivity(intent)
                    promise.resolve(true)
                    return
                }
            }

            // Bulunamazsa doğrudan başlatıcı ayarlarını aç
            openHomeSettings(promise)
        } catch (e: Exception) {
            promise.reject("ERROR_STOCK_LAUNCHER", e.message, e)
        }
    }

    @ReactMethod
    fun openHomeSettings(promise: Promise) {
        try {
            val intents = listOf(
                Intent(android.provider.Settings.ACTION_HOME_SETTINGS),
                Intent(android.provider.Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS),
                Intent(android.provider.Settings.ACTION_SETTINGS)
            )

            val pm = reactContext.packageManager
            for (intent in intents) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                if (intent.resolveActivity(pm) != null) {
                    reactContext.startActivity(intent)
                    promise.resolve(true)
                    return
                }
            }
            promise.reject("ERROR_HOME_SETTINGS", "Varsayılan uygulama ayarları açılamadı.")
        } catch (e: Exception) {
            promise.reject("ERROR_HOME_SETTINGS", e.message, e)
        }
    }

    @ReactMethod
    fun installUpdate(downloadUrl: String, promise: Promise) {
        Thread {
            try {
                val destination = File(
                    reactContext.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS),
                    "update.apk"
                )
                if (destination.exists()) {
                    destination.delete()
                }

                var currentUrl = downloadUrl
                var redirects = 0
                while (true) {
                    val url = java.net.URL(currentUrl)
                    val conn = url.openConnection() as java.net.HttpURLConnection
                    conn.instanceFollowRedirects = false
                    conn.connectTimeout = 20000
                    conn.readTimeout = 40000
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Android TV; Mobile)")
                    conn.connect()

                    val status = conn.responseCode
                    if (status == java.net.HttpURLConnection.HTTP_MOVED_PERM ||
                        status == java.net.HttpURLConnection.HTTP_MOVED_TEMP ||
                        status == 307 || status == 308
                    ) {
                        currentUrl = conn.getHeaderField("Location")
                        redirects++
                        if (redirects > 8) throw Exception("Çok fazla yönlendirme hatası")
                        continue
                    }

                    conn.inputStream.use { input ->
                        FileOutputStream(destination).use { output ->
                            val buffer = ByteArray(16384)
                            var bytesRead: Int
                            while (input.read(buffer).also { bytesRead = it } != -1) {
                                output.write(buffer, 0, bytesRead)
                            }
                            output.flush()
                        }
                    }
                    break
                }

                if (destination.exists() && destination.length() > 0) {
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
                    promise.resolve(true)
                } else {
                    promise.reject("ERROR_INSTALL", "APK dosyası indirilemedi.")
                }
            } catch (e: Exception) {
                promise.reject("ERROR_INSTALL", e.message, e)
            }
        }.start()
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
    fun openSoundSettings(promise: Promise) {
        try {
            val intent = Intent(android.provider.Settings.ACTION_SOUND_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            if (intent.resolveActivity(reactContext.packageManager) != null) {
                reactContext.startActivity(intent)
                promise.resolve(true)
                return
            }
        } catch (_: Exception) {}

        try {
            val intent = Intent(android.provider.Settings.ACTION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (err: Exception) {
            promise.reject("ERROR_SOUND", err.message, err)
        }
    }

    @ReactMethod
    fun saveSetting(key: String, value: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("GS_LAUNCHER_PREFS", Context.MODE_PRIVATE)
            prefs.edit().putString(key, value).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_SAVE", e.message, e)
        }
    }

    @ReactMethod
    fun getSetting(key: String, defaultValue: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("GS_LAUNCHER_PREFS", Context.MODE_PRIVATE)
            val res = prefs.getString(key, defaultValue) ?: defaultValue
            promise.resolve(res)
        } catch (e: Exception) {
            promise.resolve(defaultValue)
        }
    }

    @ReactMethod
    fun uninstallApp(packageName: String, promise: Promise) {
        try {
            val intent = Intent(Intent.ACTION_DELETE).apply {
                data = Uri.parse("package:$packageName")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_UNINSTALL", e.message, e)
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
