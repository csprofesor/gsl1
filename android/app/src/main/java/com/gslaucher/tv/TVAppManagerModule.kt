package com.gslaucher.tv

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.database.ContentObserver
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileOutputStream

class TVAppManagerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TVAppManager"

    private var watchNextObserver: ContentObserver? = null

    private fun registerWatchNextObserver() {
        try {
            if (watchNextObserver == null) {
                watchNextObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
                    override fun onChange(selfChange: Boolean) {
                        super.onChange(selfChange)
                        try {
                            reactContext
                                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                                .emit("onWatchNextChanged", null)
                        } catch (_: Exception) {}
                    }
                }
                reactContext.contentResolver.registerContentObserver(
                    Uri.parse("content://android.media.tv/watch_next_program"),
                    true,
                    watchNextObserver!!
                )
            }
        } catch (_: Exception) {}
    }

    override fun initialize() {
        super.initialize()
        registerWatchNextObserver()
    }

    override fun invalidate() {
        super.invalidate()
        try {
            watchNextObserver?.let {
                reactContext.contentResolver.unregisterContentObserver(it)
            }
            watchNextObserver = null
        } catch (_: Exception) {}
    }

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

            // 0. Arama sorgusu varsa panoya kopyala ve Erişilebilirlik Servisine kaydet (Otomatik Doldurma)
            if (!query.isNullOrEmpty()) {
                try {
                    val clipboard = reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                    val clip = ClipData.newPlainText("Film Arama", query)
                    clipboard?.setPrimaryClip(clip)
                } catch (_: Exception) {}

                if (!packageName.isNullOrEmpty()) {
                    try {
                        TVAccessibilityService.setAutoSearch(packageName, query)
                    } catch (_: Exception) {}
                }
            }

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

                // Cloudstream için doğrudan arama deep-link
                if (pkg.contains("cloudstream")) {
                    try {
                        val csUri = Uri.parse("cloudstream3://search?query=" + Uri.encode(query))
                        val csIntent = Intent(Intent.ACTION_VIEW, csUri).apply {
                            setPackage(packageName)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        if (csIntent.resolveActivity(pm) != null) {
                            reactContext.startActivity(csIntent)
                            promise.resolve(true)
                            return
                        }
                    } catch (_: Exception) {}
                }

                // Nuvio için doğrudan arama deep-link
                if (pkg.contains("nuvio")) {
                    try {
                        val nuvioUri = Uri.parse("nuvio://search?query=" + Uri.encode(query))
                        val nuvioIntent = Intent(Intent.ACTION_VIEW, nuvioUri).apply {
                            setPackage(packageName)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        if (nuvioIntent.resolveActivity(pm) != null) {
                            reactContext.startActivity(nuvioIntent)
                            promise.resolve(true)
                            return
                        }
                    } catch (_: Exception) {}
                }

                // Stremio için doğrudan IMDb detay veya arama deep-link
                if (pkg.contains("stremio")) {
                    try {
                        val strmUri = if (query.startsWith("tt")) {
                            Uri.parse("stremio:///detail/movie/$query")
                        } else {
                            Uri.parse("stremio:///search?search=" + Uri.encode(query))
                        }
                        val strmIntent = Intent(Intent.ACTION_VIEW, strmUri).apply {
                            setPackage("com.stremio.one")
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        if (strmIntent.resolveActivity(pm) != null) {
                            reactContext.startActivity(strmIntent)
                            promise.resolve(true)
                            return
                        }
                    } catch (_: Exception) {}
                }

                // YouTube için özel leanback arama intent
                if (pkg.contains("youtube") || pkg.contains("smarttube")) {
                    try {
                        val ytUri = Uri.parse("https://www.youtube.com/results?search_query=" + Uri.encode(query))
                        val ytIntent = Intent(Intent.ACTION_VIEW, ytUri).apply {
                            if (!packageName.isNullOrEmpty()) setPackage(packageName)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        reactContext.startActivity(ytIntent)
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

                // Standart Android TV Media / Search Intent (Tüm Diğer Medya Uygulamaları)
                if (!packageName.isNullOrEmpty()) {
                    val searchIntent = Intent(Intent.ACTION_SEARCH).apply {
                        setPackage(packageName)
                        putExtra("query", query)
                        putExtra(android.app.SearchManager.QUERY, query)
                        putExtra(Intent.EXTRA_TEXT, query)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    if (searchIntent.resolveActivity(pm) != null) {
                        reactContext.startActivity(searchIntent)
                        promise.resolve(true)
                        return
                    }
                }
            }

            // 3. Fallback: Hedef Uygulamayı Aç (Arama ve Pano ekstra verileriyle)
            if (!packageName.isNullOrEmpty()) {
                val launchIntent = pm.getLeanbackLaunchIntentForPackage(packageName)
                    ?: pm.getLaunchIntentForPackage(packageName)
                if (launchIntent != null) {
                    if (!query.isNullOrEmpty()) {
                        launchIntent.putExtra("query", query)
                        launchIntent.putExtra(android.app.SearchManager.QUERY, query)
                        launchIntent.putExtra(Intent.EXTRA_TEXT, query)
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
            TVAccessibilityService.allowStockLauncherUntil = System.currentTimeMillis() + 180000L
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
            val pm = reactContext.packageManager
            val intents = listOf(
                Intent().setComponent(android.content.ComponentName("com.android.tv.settings", "com.android.tv.settings.device.apps.DefaultAppsActivity")),
                Intent(android.provider.Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS),
                Intent("android.settings.MANAGE_DEFAULT_APPS_SETTINGS"),
                Intent(android.provider.Settings.ACTION_HOME_SETTINGS),
                Intent(android.provider.Settings.ACTION_MANAGE_APPLICATIONS_SETTINGS),
                Intent().setComponent(android.content.ComponentName("com.android.tv.settings", "com.android.tv.settings.MainSettings")),
                Intent("android.settings.TV_SETTINGS"),
                Intent(android.provider.Settings.ACTION_SETTINGS)
            )

            for (intent in intents) {
                try {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    if (intent.resolveActivity(pm) != null) {
                        reactContext.startActivity(intent)
                        promise.resolve(true)
                        return
                    }
                } catch (_: Exception) {}
            }

            val fallback = Intent(android.provider.Settings.ACTION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(fallback)
            promise.resolve(true)
        } catch (e: Exception) {
            try {
                val fallback = Intent(android.provider.Settings.ACTION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(fallback)
                promise.resolve(true)
            } catch (err: Exception) {
                promise.reject("ERROR_HOME_SETTINGS", err.message, err)
            }
        }
    }

    @ReactMethod
    fun openAccessibilitySettings(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val intents = listOf(
                Intent().setComponent(android.content.ComponentName("com.android.tv.settings", "com.android.tv.settings.accessibility.AccessibilityActivity")),
                Intent().setComponent(android.content.ComponentName("com.android.tv.settings", "com.android.tv.settings.device.accessibility.AccessibilityActivity")),
                Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS),
                Intent("android.settings.ACCESSIBILITY_SETTINGS"),
                Intent().setComponent(android.content.ComponentName("com.android.tv.settings", "com.android.tv.settings.MainSettings")),
                Intent("android.settings.TV_SETTINGS"),
                Intent(android.provider.Settings.ACTION_SETTINGS)
            )

            for (intent in intents) {
                try {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    if (intent.resolveActivity(pm) != null) {
                        reactContext.startActivity(intent)
                        promise.resolve(true)
                        return
                    }
                } catch (_: Exception) {}
            }

            val fallback = Intent(android.provider.Settings.ACTION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(fallback)
            promise.resolve(true)
        } catch (e: Exception) {
            try {
                val fallback = Intent(android.provider.Settings.ACTION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(fallback)
                promise.resolve(true)
            } catch (err: Exception) {
                promise.reject("ERROR_ACCESSIBILITY", err.message, err)
            }
        }
    }

    @ReactMethod
    fun isAccessibilityEnabled(promise: Promise) {
        try {
            promise.resolve(TVAccessibilityService.isServiceRunning)
        } catch (_: Exception) {
            promise.resolve(false)
        }
    }

    private fun emitUpdateProgress(percent: Int, downloaded: Long, total: Long) {
        try {
            val params = Arguments.createMap().apply {
                putInt("percent", percent)
                putDouble("downloaded", downloaded.toDouble())
                putDouble("total", total.toDouble())
            }
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onUpdateDownloadProgress", params)
        } catch (_: Exception) {}
    }

    @ReactMethod
    fun checkInstallPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                promise.resolve(reactContext.packageManager.canRequestPackageInstalls())
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestInstallPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${reactContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                val act = reactContext.currentActivity ?: reactContext
                act.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            try {
                val secIntent = Intent(Settings.ACTION_SECURITY_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                val act = reactContext.currentActivity ?: reactContext
                act.startActivity(secIntent)
                promise.resolve(true)
            } catch (ex: Exception) {
                promise.reject("ERROR_PERMISSION", ex.message, ex)
            }
        }
    }

    @ReactMethod
    fun installUpdate(downloadUrl: String, promise: Promise) {
        Thread {
            try {
                // Android 8.0+ Bilinmeyen Uygulama İzni Kontrolü
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    if (!reactContext.packageManager.canRequestPackageInstalls()) {
                        try {
                            val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                                data = Uri.parse("package:${reactContext.packageName}")
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            val act = reactContext.currentActivity ?: reactContext
                            act.startActivity(intent)
                        } catch (_: Exception) {
                            try {
                                val secIntent = Intent(Settings.ACTION_SECURITY_SETTINGS).apply {
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                }
                                val act = reactContext.currentActivity ?: reactContext
                                act.startActivity(secIntent)
                            } catch (_: Exception) {}
                        }
                        promise.reject(
                            "PERMISSION_NEEDED",
                            "Televizyonunuz 'Bilinmeyen Uygulamaları Yükle' izni istiyor. Lütfen ekrandaki izni açıp tekrar Güncelle butonuna basın."
                        )
                        return@Thread
                    }
                }

                // Güvenli yerel indirme konumu (cacheDir veya externalCacheDir)
                val targetDir = reactContext.externalCacheDir ?: reactContext.cacheDir
                val destination = File(targetDir, "gs_launcher_update.apk")
                if (destination.exists()) {
                    destination.delete()
                }

                var currentUrl = downloadUrl
                var redirects = 0
                val maxRedirects = 10
                var connection: java.net.HttpURLConnection? = null

                while (redirects < maxRedirects) {
                    val url = java.net.URL(currentUrl)
                    val conn = (url.openConnection() as java.net.HttpURLConnection).apply {
                        instanceFollowRedirects = false
                        connectTimeout = 25000
                        readTimeout = 45000
                        setRequestProperty("User-Agent", "Mozilla/5.0 (Android TV; Mobile)")
                        setRequestProperty("Accept-Encoding", "identity")
                    }
                    conn.connect()
                    val status = conn.responseCode

                    if (status == java.net.HttpURLConnection.HTTP_MOVED_PERM ||
                        status == java.net.HttpURLConnection.HTTP_MOVED_TEMP ||
                        status == 307 || status == 308
                    ) {
                        val location = conn.getHeaderField("Location")
                        conn.disconnect()
                        if (location.isNullOrEmpty()) {
                            throw Exception("Yönlendirme adresi boş geldi.")
                        }
                        currentUrl = java.net.URL(url, location).toString()
                        redirects++
                        continue
                    }

                    if (status != java.net.HttpURLConnection.HTTP_OK) {
                        conn.disconnect()
                        throw Exception("İndirme sunucusu yanıt vermedi (HTTP $status)")
                    }

                    connection = conn
                    break
                }

                if (connection == null) {
                    throw Exception("Güncelleme sunucusuna bağlanılamadı.")
                }

                val totalLength = connection.contentLengthLong
                var downloadedLength = 0L

                connection.inputStream.use { input ->
                    FileOutputStream(destination).use { output ->
                        val buffer = ByteArray(32768)
                        var bytesRead: Int
                        var lastEmitTime = System.currentTimeMillis()

                        while (input.read(buffer).also { bytesRead = it } != -1) {
                            output.write(buffer, 0, bytesRead)
                            downloadedLength += bytesRead

                            val now = System.currentTimeMillis()
                            if (now - lastEmitTime > 250 || (totalLength > 0 && downloadedLength == totalLength)) {
                                lastEmitTime = now
                                val percent = if (totalLength > 0) ((downloadedLength * 100) / totalLength).toInt() else -1
                                emitUpdateProgress(percent, downloadedLength, totalLength)
                            }
                        }
                        output.flush()
                    }
                }
                connection.disconnect()

                if (destination.exists() && destination.length() > 5000000) {
                    val apkUri = FileProvider.getUriForFile(
                        reactContext,
                        "${reactContext.packageName}.provider",
                        destination
                    )
                    val installIntent = Intent(Intent.ACTION_VIEW).apply {
                        setDataAndType(apkUri, "application/vnd.android.package-archive")
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    }

                    val resolveInfoList = reactContext.packageManager.queryIntentActivities(
                        installIntent,
                        PackageManager.MATCH_DEFAULT_ONLY
                    )
                    for (resolveInfo in resolveInfoList) {
                        val pkg = resolveInfo.activityInfo.packageName
                        reactContext.grantUriPermission(pkg, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }

                    val act = reactContext.currentActivity ?: reactContext
                    act.startActivity(installIntent)
                    promise.resolve(true)
                } else {
                    promise.reject("ERROR_INSTALL", "APK dosyası eksik veya hatalı indirildi.")
                }
            } catch (e: Exception) {
                promise.reject("ERROR_INSTALL", e.message ?: "Güncelleme sırasında bir hata oluştu.", e)
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
        val pm = reactContext.packageManager
        val candidates = listOf(
            Intent().setClassName("com.android.tv.settings", "com.android.tv.settings.accessories.AccessoriesActivity"),
            Intent().setClassName("com.android.tv.settings", "com.android.tv.settings.accessories.AddAccessoryActivity"),
            Intent("android.settings.BLUETOOTH_SETTINGS"),
            Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS),
            Intent().setClassName("com.xiaomi.mitv.settings", "com.xiaomi.mitv.settings.accessory.AccessoryActivity"),
            Intent().setClassName("com.android.tv.settings", "com.android.tv.settings.MainSettings"),
            Intent("android.settings.SETTINGS")
        )

        for (intent in candidates) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                if (intent.resolveActivity(pm) != null) {
                    reactContext.startActivity(intent)
                    promise.resolve(true)
                    return
                }
            } catch (_: Exception) {}
        }

        try {
            val fallback = Intent(android.provider.Settings.ACTION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(fallback)
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
        val pm = reactContext.packageManager
        val candidates = listOf(
            Intent().setClassName("com.android.tv.settings", "com.android.tv.settings.device.sound.SoundActivity"),
            Intent().setClassName("com.android.tv.settings", "com.android.tv.settings.device.sound.SoundFormatActivity"),
            Intent("android.settings.SOUND_SETTINGS"),
            Intent(android.provider.Settings.ACTION_SOUND_SETTINGS),
            Intent().setClassName("com.xiaomi.mitv.settings", "com.xiaomi.mitv.settings.sound.SoundActivity"),
            Intent().setClassName("com.android.tv.settings", "com.android.tv.settings.MainSettings"),
            Intent("android.settings.SETTINGS")
        )

        for (intent in candidates) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                if (intent.resolveActivity(pm) != null) {
                    reactContext.startActivity(intent)
                    promise.resolve(true)
                    return
                }
            } catch (_: Exception) {}
        }

        try {
            val fallback = Intent(android.provider.Settings.ACTION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(fallback)
            promise.resolve(true)
        } catch (err: Exception) {
            promise.reject("ERROR_SOUND", err.message, err)
        }
    }

    @ReactMethod
    fun getRunningApps(promise: Promise) {
        Thread {
            try {
                val am = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
                val pm = reactContext.packageManager
                val runningProcs = am.runningAppProcesses ?: emptyList()
                val result = Arguments.createArray()
                val myPkg = reactContext.packageName
                val seen = mutableSetOf<String>()

                for (proc in runningProcs) {
                    val pkg = proc.pkgList?.firstOrNull() ?: continue
                    if (pkg == myPkg || seen.contains(pkg)) continue
                    seen.add(pkg)

                    try {
                        val appInfo = pm.getApplicationInfo(pkg, 0)
                        val label = pm.getApplicationLabel(appInfo).toString()
                        val item = Arguments.createMap()
                        item.putString("packageName", pkg)
                        item.putString("name", label)
                        item.putInt("importance", proc.importance)
                        result.pushMap(item)
                    } catch (_: Exception) {}
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.resolve(Arguments.createArray())
            }
        }.start()
    }

    @ReactMethod
    fun killApp(packageName: String, promise: Promise) {
        try {
            val am = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
            am.killBackgroundProcesses(packageName)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun clearAllBackgroundApps(promise: Promise) {
        Thread {
            try {
                val am = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
                val pm = reactContext.packageManager
                val runningProcs = am.runningAppProcesses ?: emptyList()
                val myPkg = reactContext.packageName

                for (proc in runningProcs) {
                    val pkg = proc.pkgList?.firstOrNull() ?: continue
                    if (pkg != myPkg && !pkg.startsWith("android") && !pkg.startsWith("com.google.android.inputmethod")) {
                        try {
                            am.killBackgroundProcesses(pkg)
                        } catch (_: Exception) {}
                    }
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }.start()
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

            val pm = reactContext.packageManager
            val myPackage = reactContext.packageName
            val installer = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                try {
                    pm.getInstallSourceInfo(myPackage).installingPackageName
                } catch (_: Exception) {
                    pm.getInstallerPackageName(myPackage)
                }
            } else {
                @Suppress("DEPRECATION")
                pm.getInstallerPackageName(myPackage)
            }
            map.putString("installer", installer ?: "")
            val isOfficialStore = (installer == "com.android.vending")
            map.putBoolean("isStoreInstall", isOfficialStore)

            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERROR_DEVICE_INFO", e.message, e)
        }
    }

    // ================= FOTOĞRAF VE EKRAN KORUYUCU SUNUCUSU =================
    private var photoServer: TVPhotoServer? = null

    init {
        try {
            photoServer = TVPhotoServer(reactContext, 8888) {
                try {
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onPhotosUpdated", null)
                } catch (_: Exception) {}
            }
            photoServer?.start()
        } catch (_: Exception) {}
    }

    @ReactMethod
    fun getWifiIpAddress(promise: Promise) {
        try {
            var foundIp = "127.0.0.1"
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val nInterface = interfaces.nextElement()
                if (nInterface.isLoopback || !nInterface.isUp) continue
                val addresses = nInterface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val addr = addresses.nextElement()
                    if (!addr.isLoopbackAddress && addr is java.net.Inet4Address) {
                        val host = addr.hostAddress ?: ""
                        if (!host.startsWith("127.")) {
                            foundIp = host
                            break
                        }
                    }
                }
                if (foundIp != "127.0.0.1") break
            }
            promise.resolve(foundIp)
        } catch (e: Exception) {
            promise.resolve("127.0.0.1")
        }
    }

    @ReactMethod
    fun startPhotoServer(promise: Promise) {
        try {
            if (photoServer == null) {
                photoServer = TVPhotoServer(reactContext, 8888) {
                    try {
                        reactContext
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                            .emit("onPhotosUpdated", null)
                    } catch (_: Exception) {}
                }
            }
            photoServer?.start()
            getWifiIpAddress(promise)
        } catch (e: Exception) {
            promise.reject("ERROR_PHOTO_SERVER", e.message, e)
        }
    }

    @ReactMethod
    fun getUploadedPhotos(promise: Promise) {
        Thread {
            try {
                val dir = File(reactContext.filesDir, "screensaver_photos")
                val list = Arguments.createArray()
                if (dir.exists()) {
                    val files = dir.listFiles { f ->
                        val ext = f.extension.lowercase()
                        f.isFile && (ext == "jpg" || ext == "jpeg" || ext == "png" || ext == "webp")
                    }?.sortedByDescending { it.lastModified() } ?: emptyList()

                    for (f in files) {
                        val map = Arguments.createMap()
                        map.putString("name", f.name)
                        map.putString("uri", "file://${f.absolutePath}")
                        map.putDouble("size", f.length().toDouble())
                        map.putDouble("lastModified", f.lastModified().toDouble())
                        list.pushMap(map)
                    }
                }
                promise.resolve(list)
            } catch (e: Exception) {
                promise.reject("ERROR_PHOTOS", e.message, e)
            }
        }.start()
    }

    @ReactMethod
    fun deleteUploadedPhoto(name: String, promise: Promise) {
        try {
            val dir = File(reactContext.filesDir, "screensaver_photos")
            val file = File(dir, File(name).name)
            if (file.exists()) {
                file.delete()
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_DELETE_PHOTO", e.message, e)
        }
    }

    @ReactMethod
    fun clearAllUploadedPhotos(promise: Promise) {
        try {
            val dir = File(reactContext.filesDir, "screensaver_photos")
            dir.listFiles()?.forEach { it.delete() }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_CLEAR_PHOTOS", e.message, e)
        }
    }

    @ReactMethod
    fun setKeepScreenOn(keepOn: Boolean, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val act = reactContext.currentActivity
                if (act != null) {
                    if (keepOn) {
                        act.window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    } else {
                        act.window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    }
                    promise.resolve(true)
                } else {
                    promise.resolve(false)
                }
            } catch (e: Exception) {
                promise.reject("ERROR_KEEP_SCREEN", e.message, e)
            }
        }
    }

    @ReactMethod
    fun copyToClipboard(text: String, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val clipboard = reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                val clip = ClipData.newPlainText("Film Arama", text)
                clipboard?.setPrimaryClip(clip)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERROR_CLIPBOARD", e.message, e)
            }
        }
    }

    @ReactMethod
    fun openDreamSettings(promise: Promise) {
        try {
            val intents = listOf(
                Intent(Settings.ACTION_DREAM_SETTINGS),
                Intent("android.settings.DREAM_SETTINGS"),
                Intent(Settings.ACTION_DISPLAY_SETTINGS),
                Intent(Settings.ACTION_SETTINGS)
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
            promise.reject("ERROR_DREAM", "Uyku ayarları açılamadı.")
        } catch (e: Exception) {
            promise.reject("ERROR_DREAM", e.message, e)
        }
    }

    @ReactMethod
    fun hasTvListingsPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val granted = ContextCompat.checkSelfPermission(
                    reactContext,
                    "android.permission.READ_TV_LISTINGS"
                ) == PackageManager.PERMISSION_GRANTED
                promise.resolve(granted)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestTvListingsPermission(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                ActivityCompat.requestPermissions(
                    activity,
                    arrayOf("android.permission.READ_TV_LISTINGS"),
                    2026
                )
                promise.resolve(true)
            } else {
                openAppPermissionSettings(promise)
            }
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun openAppPermissionSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", reactContext.packageName, null)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun getSystemWatchNextPrograms(promise: Promise) {
        val result = Arguments.createArray()
        val pm = reactContext.packageManager

        // Yalnızca resmi Android TV "Watch Next" sağlayıcısını sorgula (content://android.media.tv/watch_next_program)
        val uri = Uri.parse("content://android.media.tv/watch_next_program")
        var cursor: android.database.Cursor? = null

        try {
            // En son izlenenleri en başa almak için last_engagement_time_utc_millis DESC dene
            cursor = reactContext.contentResolver.query(
                uri,
                null,
                null,
                null,
                "last_engagement_time_utc_millis DESC"
            )
        } catch (_: Exception) {
            try {
                // Bazı ROM'larda bu sıralama sütunu yoksa sıralamasız güvenli sorgu yap
                cursor = reactContext.contentResolver.query(uri, null, null, null, null)
            } catch (_: Exception) {
            }
        }

        if (cursor != null) {
            try {
                val idCol = cursor.getColumnIndex("_id")
                val pkgCol = cursor.getColumnIndex("package_name")
                val titleCol = cursor.getColumnIndex("title")
                val epTitleCol = cursor.getColumnIndex("episode_title")
                val descCol = cursor.getColumnIndex("short_description")
                val posterCol = cursor.getColumnIndex("poster_art_uri")
                val thumbCol = cursor.getColumnIndex("thumbnail_uri")
                val intentCol = cursor.getColumnIndex("intent_uri")
                val posCol = cursor.getColumnIndex("last_playback_position_millis")
                val durCol = cursor.getColumnIndex("duration_millis")
                val typeCol = cursor.getColumnIndex("watch_next_type")

                var count = 0
                while (cursor.moveToNext() && count < 30) {
                    val id = if (idCol >= 0) cursor.getLong(idCol) else 0L
                    val pkg = if (pkgCol >= 0) cursor.getString(pkgCol) ?: "" else ""
                    val title = if (titleCol >= 0) cursor.getString(titleCol) ?: "" else ""
                    val epTitle = if (epTitleCol >= 0) cursor.getString(epTitleCol) ?: "" else ""
                    val desc = if (descCol >= 0) cursor.getString(descCol) ?: "" else ""
                    val poster = if (posterCol >= 0) cursor.getString(posterCol) ?: "" else ""
                    val thumb = if (thumbCol >= 0) cursor.getString(thumbCol) ?: "" else ""
                    val intentUri = if (intentCol >= 0) cursor.getString(intentCol) ?: "" else ""
                    val posMs = if (posCol >= 0) cursor.getLong(posCol) else 0L
                    val durMs = if (durCol >= 0) cursor.getLong(durCol) else 0L
                    val watchNextType = if (typeCol >= 0) cursor.getInt(typeCol) else 0

                    // Yalnızca devam eden veya sıradaki bölüm (0=CONTINUE, 1=NEXT) veya pozitif izleme süresi olanları al
                    if (watchNextType != 0 && watchNextType != 1 && posMs <= 0) {
                        continue
                    }

                    val displayTitle = when {
                        title.isNotEmpty() -> title
                        epTitle.isNotEmpty() -> epTitle
                        else -> ""
                    }
                    if (displayTitle.isEmpty()) continue

                    var appName = pkg
                    try {
                        val appInfo = pm.getApplicationInfo(pkg, 0)
                        appName = pm.getApplicationLabel(appInfo).toString()
                    } catch (_: Exception) {}

                    val item = Arguments.createMap()
                    item.putString("id", "sys_${id}")
                    item.putDouble("systemProgramId", id.toDouble())
                    item.putString("pkg", pkg)
                    item.putString("platform", appName)
                    item.putString("platformIcon", "▶")
                    item.putString("title", displayTitle)

                    val subtitle = when {
                        epTitle.isNotEmpty() && epTitle != title -> "$appName • $epTitle"
                        desc.isNotEmpty() -> "$appName • $desc"
                        else -> "$appName • Kaldığın Yerden"
                    }
                    item.putString("subtitle", subtitle)

                    val backdrop = when {
                        poster.isNotEmpty() -> poster
                        thumb.isNotEmpty() -> thumb
                        else -> ""
                    }
                    item.putString("backdropUrl", backdrop)
                    item.putString("intentUri", intentUri)

                    val kaldigiDk = if (posMs > 0) (posMs / 60000).toInt() else 10
                    val toplamDk = if (durMs > 0) (durMs / 60000).toInt() else 100
                    item.putInt("kaldigiDk", kaldigiDk)
                    item.putInt("toplamDk", if (toplamDk > 0) toplamDk else 100)
                    item.putString("sonIzlemeZamani", "Kaldığın Yerden")
                    item.putBoolean("isSystemWatchNext", true)

                    result.pushMap(item)
                    count++
                }
            } catch (_: Exception) {
            } finally {
                try { cursor.close() } catch (_: Exception) {}
            }
        }

        promise.resolve(result)
    }

    @ReactMethod
    fun launchWatchNextProgram(programId: Double, intentUri: String?, packageName: String?, promise: Promise) {
        try {
            val pm = reactContext.packageManager
            var launched = false

            // 1. Doğrudan Intent URI ile oynatıcıyı başlat
            if (!intentUri.isNullOrEmpty()) {
                try {
                    val intent = Intent.parseUri(intentUri, Intent.URI_INTENT_SCHEME).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    if (intent.resolveActivity(pm) != null) {
                        reactContext.startActivity(intent)
                        launched = true
                    }
                } catch (_: Exception) {}
            }

            // 2. Android TV TvContract program URI ile ACTION_VIEW dene
            if (!launched && programId > 0) {
                try {
                    val contentUri = Uri.parse("content://android.media.tv/watch_next_program/${programId.toLong()}")
                    val viewIntent = Intent(Intent.ACTION_VIEW, contentUri).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        if (!packageName.isNullOrEmpty()) {
                            setPackage(packageName)
                        }
                    }
                    if (viewIntent.resolveActivity(pm) != null) {
                        reactContext.startActivity(viewIntent)
                        launched = true
                    }
                } catch (_: Exception) {}
            }

            // 3. Hedef paketi başlat
            if (!launched && !packageName.isNullOrEmpty()) {
                val launchIntent = pm.getLaunchIntentForPackage(packageName)?.apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                if (launchIntent != null) {
                    reactContext.startActivity(launchIntent)
                    launched = true
                }
            }

            promise.resolve(launched)
        } catch (e: Exception) {
            promise.reject("LAUNCH_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun removeSystemWatchNextProgram(programId: Double, promise: Promise) {
        try {
            val uri = Uri.parse("content://android.media.tv/watch_next_program/${programId.toLong()}")
            val count = reactContext.contentResolver.delete(uri, null, null)
            promise.resolve(count > 0)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun insertWatchNextProgram(
        title: String,
        subtitle: String,
        pkg: String,
        backdropUrl: String,
        posterUrl: String,
        promise: Promise
    ) {
        try {
            val uri = Uri.parse("content://android.media.tv/watch_next_program")
            val values = ContentValues().apply {
                put("package_name", if (pkg.isNotEmpty()) pkg else reactContext.packageName)
                put("title", title)
                put("episode_title", subtitle)
                put("short_description", "$title • Kaldığın Yerden")
                put("poster_art_uri", posterUrl)
                put("thumbnail_uri", backdropUrl)
                put("watch_next_type", 0) // WATCH_NEXT_TYPE_CONTINUE
                put("last_playback_position_millis", 25 * 60 * 1000L)
                put("duration_millis", 120 * 60 * 1000L)
                put("last_engagement_time_utc_millis", System.currentTimeMillis())
                put("searchable", 1)
            }
            val res = reactContext.contentResolver.insert(uri, values)
            promise.resolve(res != null)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun createTestWatchNextProgram(promise: Promise) {
        try {
            val uri = Uri.parse("content://android.media.tv/watch_next_program")
            val values = ContentValues().apply {
                put("package_name", reactContext.packageName)
                put("title", "Interstellar (Yıldızlararası)")
                put("episode_title", "4K UHD • Bilim Kurgu")
                put("short_description", "GS TV Launcher Test Yayını • Kaldığın Yerden Oynat")
                put("poster_art_uri", "https://images.metahub.space/background/medium/tt0816692/img")
                put("thumbnail_uri", "https://images.metahub.space/poster/medium/tt0816692/img")
                put("watch_next_type", 0) // WATCH_NEXT_TYPE_CONTINUE
                put("last_playback_position_millis", 54 * 60 * 1000L) // 54. dakika
                put("duration_millis", 169 * 60 * 1000L) // 169 dakika
                put("last_engagement_time_utc_millis", System.currentTimeMillis())
                put("searchable", 1)
            }
            val insertedUri = reactContext.contentResolver.insert(uri, values)
            promise.resolve(insertedUri != null)
        } catch (e: Exception) {
            promise.reject("TEST_INSERT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearAllTestWatchNextPrograms(promise: Promise) {
        try {
            val uri = Uri.parse("content://android.media.tv/watch_next_program")
            val deleted = reactContext.contentResolver.delete(
                uri,
                "package_name = ?",
                arrayOf(reactContext.packageName)
            )
            promise.resolve(deleted > 0)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun getTvAppChannels(promise: Promise) {
        val result = Arguments.createArray()
        val pm = reactContext.packageManager
        try {
            val uri = Uri.parse("content://android.media.tv/channel")
            val cursor = reactContext.contentResolver.query(uri, null, null, null, null)
            if (cursor != null) {
                try {
                    val idCol = cursor.getColumnIndex("_id")
                    val pkgCol = cursor.getColumnIndex("package_name")
                    val nameCol = cursor.getColumnIndex("display_name")
                    val descCol = cursor.getColumnIndex("description")
                    val typeCol = cursor.getColumnIndex("type")

                    while (cursor.moveToNext()) {
                        val id = if (idCol >= 0) cursor.getLong(idCol) else 0L
                        val pkg = if (pkgCol >= 0) cursor.getString(pkgCol) ?: "" else ""
                        val displayName = if (nameCol >= 0) cursor.getString(nameCol) ?: "" else ""
                        val desc = if (descCol >= 0) cursor.getString(descCol) ?: "" else ""
                        val type = if (typeCol >= 0) cursor.getString(typeCol) ?: "" else ""

                        var appName = pkg
                        try {
                            val appInfo = pm.getApplicationInfo(pkg, 0)
                            appName = pm.getApplicationLabel(appInfo).toString()
                        } catch (_: Exception) {}

                        val channelMap = Arguments.createMap()
                        channelMap.putDouble("id", id.toDouble())
                        channelMap.putString("pkg", pkg)
                        channelMap.putString("appName", appName)
                        channelMap.putString("displayName", if (displayName.isNotEmpty()) displayName else appName)
                        channelMap.putString("description", desc)
                        channelMap.putString("type", type)
                        result.pushMap(channelMap)
                    }
                } finally {
                    cursor.close()
                }
            }
        } catch (_: Exception) {}
        promise.resolve(result)
    }

    @ReactMethod
    fun getChannelPreviewPrograms(channelId: Double, promise: Promise) {
        val result = Arguments.createArray()
        val pm = reactContext.packageManager
        try {
            val uri = Uri.parse("content://android.media.tv/preview_program")
            val cursor = reactContext.contentResolver.query(
                uri,
                null,
                "channel_id = ?",
                arrayOf(channelId.toLong().toString()),
                null
            )
            if (cursor != null) {
                try {
                    val idCol = cursor.getColumnIndex("_id")
                    val pkgCol = cursor.getColumnIndex("package_name")
                    val titleCol = cursor.getColumnIndex("title")
                    val epTitleCol = cursor.getColumnIndex("episode_title")
                    val descCol = cursor.getColumnIndex("short_description")
                    val posterCol = cursor.getColumnIndex("poster_art_uri")
                    val thumbCol = cursor.getColumnIndex("thumbnail_uri")
                    val intentCol = cursor.getColumnIndex("intent_uri")
                    val posCol = cursor.getColumnIndex("last_playback_position_millis")
                    val durCol = cursor.getColumnIndex("duration_millis")

                    var count = 0
                    while (cursor.moveToNext() && count < 20) {
                        val id = if (idCol >= 0) cursor.getLong(idCol) else 0L
                        val pkg = if (pkgCol >= 0) cursor.getString(pkgCol) ?: "" else ""
                        val title = if (titleCol >= 0) cursor.getString(titleCol) ?: "" else ""
                        val epTitle = if (epTitleCol >= 0) cursor.getString(epTitleCol) ?: "" else ""
                        val desc = if (descCol >= 0) cursor.getString(descCol) ?: "" else ""
                        val poster = if (posterCol >= 0) cursor.getString(posterCol) ?: "" else ""
                        val thumb = if (thumbCol >= 0) cursor.getString(thumbCol) ?: "" else ""
                        val intentUri = if (intentCol >= 0) cursor.getString(intentCol) ?: "" else ""
                        val posMs = if (posCol >= 0) cursor.getLong(posCol) else 0L
                        val durMs = if (durCol >= 0) cursor.getLong(durCol) else 0L

                        val displayTitle = if (title.isNotEmpty()) title else epTitle
                        if (displayTitle.isEmpty()) continue

                        var appName = pkg
                        try {
                            val appInfo = pm.getApplicationInfo(pkg, 0)
                            appName = pm.getApplicationLabel(appInfo).toString()
                        } catch (_: Exception) {}

                        val item = Arguments.createMap()
                        item.putString("id", "prev_${id}")
                        item.putDouble("systemProgramId", id.toDouble())
                        item.putString("pkg", pkg)
                        item.putString("platform", appName)
                        item.putString("platformIcon", "📺")
                        item.putString("title", displayTitle)
                        item.putString("subtitle", if (epTitle.isNotEmpty()) epTitle else desc)
                        item.putString("backdropUrl", if (poster.isNotEmpty()) poster else thumb)
                        item.putString("intentUri", intentUri)
                        val kaldigiDk = if (posMs > 0) (posMs / 60000).toInt() else 10
                        val toplamDk = if (durMs > 0) (durMs / 60000).toInt() else 100
                        item.putInt("kaldigiDk", kaldigiDk)
                        item.putInt("toplamDk", toplamDk)
                        item.putString("sonIzlemeZamani", "Kanal İçeriği")
                        item.putBoolean("isSystemWatchNext", true)

                        result.pushMap(item)
                        count++
                    }
                } finally {
                    cursor.close()
                }
            }
        } catch (_: Exception) {}
        promise.resolve(result)
    }
}
