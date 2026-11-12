package com.gslaucher.tv

import android.accessibilityservice.AccessibilityServiceInfo
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.database.ContentObserver
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
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
                        } catch (e: Exception) {}
                    }
                }
                reactContext.contentResolver.registerContentObserver(
                    Uri.parse("content://android.media.tv/watch_next_program"),
                    true,
                    watchNextObserver!!
                )
            }
        } catch (e: Exception) {}
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
        } catch (e: Exception) {}
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
                        } catch (e: Exception) {}

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
                        } catch (e: Exception) {}

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
                } catch (e: Exception) {}

                if (!packageName.isNullOrEmpty()) {
                    try {
                        TVAccessibilityService.setAutoSearch(packageName, query)
                    } catch (e: Exception) {}
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
                } catch (e: Exception) {}

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
                } catch (e: Exception) {}
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
                    } catch (e: Exception) {}
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
                    } catch (e: Exception) {}
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
                    } catch (e: Exception) {}
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
                    } catch (e: Exception) {}
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
                    } catch (e: Exception) {}
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
        TVAccessibilityService.allowStockLauncherUntil = System.currentTimeMillis() + 180000L
        val intents = listOf(
            Intent().setComponent(android.content.ComponentName("com.android.tv.settings", "com.android.tv.settings.device.apps.DefaultAppsActivity")),
            Intent(android.provider.Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS),
            Intent("android.settings.MANAGE_DEFAULT_APPS_SETTINGS"),
            Intent(android.provider.Settings.ACTION_HOME_SETTINGS),
            Intent("android.settings.HOME_SETTINGS"),
            Intent(android.provider.Settings.ACTION_MANAGE_APPLICATIONS_SETTINGS),
            Intent().setComponent(android.content.ComponentName("com.android.tv.settings", "com.android.tv.settings.MainSettings")),
            Intent("android.settings.TV_SETTINGS"),
            Intent(android.provider.Settings.ACTION_SETTINGS)
        )

        for (intent in intents) {
            try {
                val act = reactContext.currentActivity
                if (act != null) {
                    act.startActivity(intent)
                } else {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    reactContext.startActivity(intent)
                }
                promise.resolve(true)
                return
            } catch (e: Throwable) {}
        }
        promise.resolve(false)
    }

    @ReactMethod
    fun openLanguageSettings(promise: Promise) {
        val intents = listOf(
            Intent(Settings.ACTION_LOCALE_SETTINGS),
            Intent("android.settings.LOCALE_SETTINGS"),
            Intent().setComponent(android.content.ComponentName("com.android.tv.settings", "com.android.tv.settings.system.LanguageActivity")),
            Intent().setComponent(android.content.ComponentName("com.android.tv.settings", "com.android.tv.settings.device.LanguageActivity")),
            Intent("android.settings.TV_SETTINGS"),
            Intent(Settings.ACTION_SETTINGS)
        )

        for (intent in intents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(intent)
                promise.resolve(true)
                return
            } catch (e: Throwable) {}
        }
        promise.resolve(false)
    }

    @ReactMethod
    fun openAccessibilitySettings(promise: Promise) {
        // Kullanıcı ayarlarda gezinirken ve izin onaylarken 3 dakika boyunca launcher müdahalesini engelle
        TVAccessibilityService.allowStockLauncherUntil = System.currentTimeMillis() + 180000L

        val intents = listOf(
            // 1. Standart Android Erişilebilirlik Intent'i (En genel ve kesin çalışan)
            Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS),
            Intent("android.settings.ACCESSIBILITY_SETTINGS"),

            // 2. Android TV / Leanback Erişilebilirlik Aktiviteleri
            Intent().setComponent(android.content.ComponentName("com.android.tv.settings", "com.android.tv.settings.accessibility.AccessibilityActivity")),
            Intent().setComponent(android.content.ComponentName("com.android.tv.settings", "com.android.tv.settings.device.accessibility.AccessibilityActivity")),
            Intent().setComponent(android.content.ComponentName("com.android.tv.settings", "com.android.tv.settings.device.DevicePrefActivity")),

            // 3. Xiaomi TV / Mi Box Özel Ayar Aktiviteleri
            Intent().setComponent(android.content.ComponentName("com.xiaomi.mitv.settings", "com.xiaomi.mitv.settings.MainActivity")),
            Intent().setComponent(android.content.ComponentName("com.mitv.tvhome", "com.mitv.tvhome.SettingsActivity")),

            // 4. Android TV Genel Ayarları
            Intent("android.settings.TV_SETTINGS"),
            Intent().setComponent(android.content.ComponentName("com.android.tv.settings", "com.android.tv.settings.MainSettings")),

            // 5. Standart Android Ayarlar
            Intent(android.provider.Settings.ACTION_SETTINGS)
        )

        for (intent in intents) {
            try {
                val act = reactContext.currentActivity
                if (act != null) {
                    act.startActivity(intent)
                } else {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    reactContext.startActivity(intent)
                }
                promise.resolve(true)
                return
            } catch (e: Throwable) {}
        }

        promise.resolve(false)
    }

    @ReactMethod
    fun isAccessibilityEnabled(promise: Promise) {
        try {
            if (TVAccessibilityService.isServiceRunning) {
                promise.resolve(true)
                return
            }
            val am = reactContext.getSystemService(AccessibilityManager::class.java)
            val isRunningInAm = am?.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
                ?.any { it.resolveInfo?.serviceInfo?.packageName == reactContext.packageName } ?: false
            if (isRunningInAm) {
                promise.resolve(true)
                return
            }
            val expectedService = "${reactContext.packageName}/${TVAccessibilityService::class.java.canonicalName}"
            val enabledServices = android.provider.Settings.Secure.getString(
                reactContext.contentResolver,
                android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: ""
            val isEnabled = enabledServices.split(":").any {
                it.equals(expectedService, ignoreCase = true) || it.contains("TVAccessibilityService")
            }
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Android 13+ (Mi Box / Google TV) yerel/indirilen APK'larda kısıtlanmış ayarları (Restricted Settings) denetler.
     */
    @ReactMethod
    fun isRestrictedSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                promise.resolve(false)
                return
            }
            val source = try {
                reactContext.packageManager.getInstallSourceInfo(reactContext.packageName).packageSource
            } catch (e: Throwable) {
                null
            }
            val isRestricted = (source == PackageInstaller.PACKAGE_SOURCE_LOCAL_FILE || 
                                source == PackageInstaller.PACKAGE_SOURCE_DOWNLOADED_FILE)
            promise.resolve(isRestricted)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Matinee Paritesi: TV cihazı üzerindeki yerel ADB portuna (127.0.0.1:5555) bağlanarak
     * tek tıkla gerekli izinleri (Restricted Settings & Accessibility) otomatik verir ve
     * kullanıcının hiçbir şey yapmasına gerek kalmadan servisi kalıcı açar.
     */
    @ReactMethod
    fun setupLocalAdb(promise: Promise) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val adb = LocalAdb(reactContext)
                val result = adb.setUp()
                when (result) {
                    LocalAdb.SetupResult.DONE -> promise.resolve("DONE")
                    LocalAdb.SetupResult.ADB_OFF -> promise.resolve("ADB_OFF")
                    LocalAdb.SetupResult.NOT_ALLOWED -> promise.resolve("NOT_ALLOWED")
                    LocalAdb.SetupResult.FAILED -> promise.resolve("FAILED")
                }
            } catch (e: Throwable) {
                promise.resolve("ERROR: ${e.message}")
            }
        }
    }

    /**
     * TV Geliştirici Seçeneklerini doğrudan açar (USB/Ağ Hata Ayıklama anahtarını açabilmek için).
     */
    @ReactMethod
    fun openDeveloperSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Throwable) {
            val fallback = Intent(Settings.ACTION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            try {
                reactContext.startActivity(fallback)
                promise.resolve(true)
            } catch (err: Throwable) {
                promise.resolve(false)
            }
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
        } catch (e: Exception) {}
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
                        } catch (e: Exception) {
                            try {
                                val secIntent = Intent(Settings.ACTION_SECURITY_SETTINGS).apply {
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                }
                                val act = reactContext.currentActivity ?: reactContext
                                act.startActivity(secIntent)
                            } catch (e: Exception) {}
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
        val intents = listOf(
            Intent("android.settings.TV_SETTINGS"),
            Intent().setComponent(android.content.ComponentName("com.android.tv.settings", "com.android.tv.settings.MainSettings")),
            Intent(android.provider.Settings.ACTION_SETTINGS)
        )
        for (intent in intents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(intent)
                promise.resolve(true)
                return
            } catch (e: Throwable) {}
        }
        promise.resolve(false)
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
        // 1. Android TV / Google TV Canlı TV Uygulama Paketleri
        val liveTvPackages = listOf(
            "com.google.android.tv",               // Google Live Channels
            "com.android.tv",                      // AOSP Live TV / Tuner
            "com.mitv.tvhome",                     // Xiaomi Mi TV Canlı TV
            "com.xiaomi.mitv.tvbox.launcher",
            "com.xiaomi.mitv.mediaexplorer",
            "ar.tvplayer.tv",                      // TiviMate
            "com.tivimate.player",
            "com.nst.iptvsmarterstvbox"            // IPTV Smarters Pro
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
            } catch (ignored: Throwable) {}
        }

        // 2. Android TvContract Intent (Dahili Uydu Tuner & Canlı TV Kanalları)
        val directIntents = listOf(
            Intent(Intent.ACTION_VIEW, Uri.parse("content://android.media.tv/channel")),
            Intent("android.media.tv.action.VIEW_INPUTS"),
            Intent().setComponent(android.content.ComponentName("com.google.android.tv", "com.android.tv.MainActivity")),
            Intent().setComponent(android.content.ComponentName("com.android.tv", "com.android.tv.MainActivity")),
            Intent().setComponent(android.content.ComponentName("com.mitv.tvhome", "com.mitv.tvhome.MainActivity")),
            Intent("android.intent.action.VIEW", Uri.parse("tv://live"))
        )

        for (intent in directIntents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(intent)
                promise.resolve(true)
                return
            } catch (e: Throwable) {}
        }

        promise.resolve(false)
    }

    @ReactMethod
    fun openTVInputs(promise: Promise) {
        val intents = listOf(
            Intent("android.media.tv.action.VIEW_INPUTS"),
            Intent().setComponent(android.content.ComponentName("com.android.tv.settings", "com.android.tv.settings.inputs.InputsActivity")),
            Intent().setComponent(android.content.ComponentName("com.android.tv.settings", "com.android.tv.settings.device.inputs.InputsActivity")),
            Intent().setComponent(android.content.ComponentName("com.xiaomi.mitv.settings", "com.xiaomi.mitv.settings.input.InputActivity")),
            Intent().setComponent(android.content.ComponentName("com.mitv.tvhome", "com.mitv.tvhome.InputsActivity"))
        )
        for (intent in intents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(intent)
                promise.resolve(true)
                return
            } catch (e: Throwable) {}
        }
        promise.resolve(false)
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
            } catch (e: Exception) {}
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
            } catch (e: Exception) {}
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
                    } catch (e: Exception) {}
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
                        } catch (e: Exception) {}
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
                } catch (e: Exception) {
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
                } catch (e: Exception) {}
            }
            photoServer?.start()
        } catch (e: Exception) {}
    }

    @ReactMethod
    fun getWifiIpAddress(promise: Promise) {
        try {
            var foundIp = "127.0.0.1"

            // 1. WifiManager Connection Info (en doğru Wi-Fi IP'si)
            try {
                val wifiManager = reactContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                val ipInt = wifiManager?.connectionInfo?.ipAddress ?: 0
                if (ipInt != 0) {
                    foundIp = String.format(
                        java.util.Locale.US,
                        "%d.%d.%d.%d",
                        ipInt and 0xff,
                        ipInt shr 8 and 0xff,
                        ipInt shr 16 and 0xff,
                        ipInt shr 24 and 0xff
                    )
                }
            } catch (e: Exception) {}

            // 2. Eğer bulunamadıysa aktif ağ arayüzlerini tara (wlan, eth)
            if (foundIp == "127.0.0.1" || foundIp.isEmpty()) {
                val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
                while (interfaces.hasMoreElements()) {
                    val nInterface = interfaces.nextElement()
                    if (nInterface.isLoopback || !nInterface.isUp) continue
                    val name = nInterface.name.lowercase()
                    if (name.startsWith("wlan") || name.startsWith("eth") || name.startsWith("en")) {
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
                    }
                    if (foundIp != "127.0.0.1") break
                }
            }

            promise.resolve(foundIp)
        } catch (e: Exception) {
            promise.resolve("127.0.0.1")
        }
    }

    @ReactMethod
    fun getConnectedWifiInfo(promise: Promise) {
        try {
            val map = Arguments.createMap()
            val wifiManager = reactContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val connManager = reactContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

            var ssid = ""
            var isConnected = false
            var rssi = -100

            if (wifiManager != null) {
                val info = wifiManager.connectionInfo
                if (info != null && info.networkId != -1) {
                    val rawSsid = info.ssid ?: ""
                    val cleanSsid = rawSsid.replace("\"", "")
                    if (cleanSsid != "<unknown ssid>" && cleanSsid.isNotEmpty()) {
                        ssid = cleanSsid
                        isConnected = true
                        rssi = info.rssi
                    }
                }
            }

            if (!isConnected && connManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val net = connManager.activeNetwork
                    val caps = connManager.getNetworkCapabilities(net)
                    if (caps != null) {
                        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                            isConnected = true
                            if (ssid.isEmpty() || ssid == "<unknown ssid>") {
                                ssid = "Wi-Fi"
                            }
                        } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                            isConnected = true
                            ssid = "Ethernet (Kablolu)"
                        }
                    }
                }
            }

            map.putBoolean("isConnected", isConnected)
            map.putString("ssid", ssid)
            map.putInt("rssi", rssi)
            promise.resolve(map)
        } catch (e: Exception) {
            val map = Arguments.createMap()
            map.putBoolean("isConnected", false)
            map.putString("ssid", "")
            map.putInt("rssi", -100)
            promise.resolve(map)
        }
    }

    data class WifiNetworkItem(
        val ssid: String,
        val level: Int = -70,
        val frequency: Int = 2400,
        val capabilities: String = "",
        val isConnected: Boolean = false,
        val isSecure: Boolean = false
    )

    @ReactMethod
    fun scanWifiNetworks(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val wifiManager = reactContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                val result = Arguments.createArray()

                if (wifiManager != null) {
                    try {
                        wifiManager.startScan()
                    } catch (e: Exception) {}

                    // Wi-Fi donanımının kanalları tarayıp sonuçları güncellemesi için bekle
                    kotlinx.coroutines.delay(1200L)

                    val connectionInfo = try { wifiManager.connectionInfo } catch (e: Exception) { null }
                    val rawConnectedSsid = connectionInfo?.ssid?.replace("\"", "")?.trim() ?: ""
                    val connectedSsid = if (rawConnectedSsid == "<unknown ssid>") "" else rawConnectedSsid
                    val connectedRssi = connectionInfo?.rssi ?: -55

                    // SSID -> WifiNetworkItem
                    val networks = mutableMapOf<String, WifiNetworkItem>()

                    // 1. Aktif bağlı ağı her zaman ilk sıraya koy
                    if (connectedSsid.isNotEmpty()) {
                        networks[connectedSsid] = WifiNetworkItem(
                            ssid = connectedSsid,
                            level = connectedRssi,
                            frequency = 5000,
                            capabilities = "[WPA2-PSK-CCMP][ESS]",
                            isConnected = true,
                            isSecure = true
                        )
                    }

                    // 2. Gerçek tarama sonuçlarını ekle/güncelle
                    try {
                        val scanResults = wifiManager.scanResults
                        if (scanResults != null) {
                            for (scan in scanResults) {
                                val s = scan.SSID?.trim() ?: ""
                                if (s.isEmpty()) continue
                                val isConn = (s == connectedSsid && connectedSsid.isNotEmpty())
                                val isSecure = scan.capabilities?.contains("WPA") == true || scan.capabilities?.contains("WEP") == true
                                val existing = networks[s]
                                if (existing == null || scan.level > existing.level) {
                                    networks[s] = WifiNetworkItem(
                                        ssid = s,
                                        level = scan.level,
                                        frequency = scan.frequency,
                                        capabilities = scan.capabilities ?: "",
                                        isConnected = isConn,
                                        isSecure = isSecure
                                    )
                                }
                            }
                        }
                    } catch (e: Exception) {}

                    // 3. Eğer scanResults boş geldiyse (Android TV konum kısıtlaması nedeniyle),
                    // sistemin doğrudan 'cmd wifi list-scan-results' çıktısını ayrıştırıp listeye ekle
                    if (networks.size <= 1) {
                        try {
                            val process = Runtime.getRuntime().exec("cmd wifi list-scan-results")
                            val reader = java.io.BufferedReader(java.io.InputStreamReader(process.inputStream))
                            var line: String?
                            while (reader.readLine().also { line = it } != null) {
                                val l = line?.trim() ?: continue
                                val parts = l.split("\\s+".toRegex())
                                if (parts.size >= 5 && parts[0].contains(":")) {
                                    val freq = parts[1].toIntOrNull() ?: 2400
                                    val level = parts[2].toIntOrNull() ?: -70
                                    val flags = parts[3]
                                    val ssid = parts.drop(4).joinToString(" ").trim()
                                    if (ssid.isNotEmpty() && !networks.containsKey(ssid)) {
                                        val isConn = (ssid == connectedSsid && connectedSsid.isNotEmpty())
                                        val isSec = flags.contains("WPA") || flags.contains("WEP")
                                        networks[ssid] = WifiNetworkItem(
                                            ssid = ssid,
                                            level = level,
                                            frequency = freq,
                                            capabilities = flags,
                                            isConnected = isConn,
                                            isSecure = isSec
                                        )
                                    }
                                }
                            }
                            reader.close()
                        } catch (_: Throwable) {}
                    }

                    // 4. Android TV'de kayıtlı / bilinen ağları ekle
                    try {
                        val configured = wifiManager.configuredNetworks
                        if (configured != null) {
                            for (cfg in configured) {
                                val s = cfg.SSID?.replace("\"", "")?.trim() ?: ""
                                if (s.isNotEmpty() && !networks.containsKey(s)) {
                                    networks[s] = WifiNetworkItem(
                                        ssid = s,
                                        level = -65,
                                        frequency = 2400,
                                        capabilities = "[WPA2-PSK-CCMP][ESS]",
                                        isConnected = s == connectedSsid,
                                        isSecure = true
                                    )
                                }
                            }
                        }
                    } catch (e: Exception) {}

                    val sorted = networks.values.sortedWith(
                        compareByDescending<WifiNetworkItem> { it.isConnected }
                            .thenByDescending { it.level }
                    )

                    for (w in sorted) {
                        val item = Arguments.createMap()
                        item.putString("ssid", w.ssid)
                        item.putInt("level", w.level)
                        item.putInt("frequency", w.frequency)
                        item.putString("capabilities", w.capabilities)
                        item.putBoolean("isConnected", w.isConnected)
                        item.putBoolean("isSecure", w.isSecure)
                        result.pushMap(item)
                    }
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.resolve(Arguments.createArray())
            }
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
                    } catch (e: Exception) {}
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
            val activity = reactContext.currentActivity
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

        val prefs = reactContext.getSharedPreferences("GS_LAUNCHER_PREFS", Context.MODE_PRIVATE)
        val sonTemizlemeZamani = prefs.getLong("gs_son_devam_temizleme_zamani", 0L)
        val silinenSet = prefs.getStringSet("gs_silinen_devam_idler", emptySet()) ?: emptySet()

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
        } catch (e: Exception) {
            try {
                // Bazı ROM'larda bu sıralama sütunu yoksa sıralamasız güvenli sorgu yap
                cursor = reactContext.contentResolver.query(uri, null, null, null, null)
            } catch (e: Exception) {
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
                val engTimeCol = cursor.getColumnIndex("last_engagement_time_utc_millis")

                var count = 0
                // Tren gibi dizilmemesi için en güncel maksimum 10 içerik al
                while (cursor.moveToNext() && count < 10) {
                    val id = if (idCol >= 0) cursor.getLong(idCol) else 0L
                    val engTime = if (engTimeCol >= 0) cursor.getLong(engTimeCol) else 0L

                    // 1. Kullanıcı listeyi sildikten ÖNCEKİ eski içerikleri kesinlikle dahil etme!
                    if (sonTemizlemeZamani > 0L && engTime > 0L && engTime <= sonTemizlemeZamani) {
                        continue
                    }

                    // 2. Kullanıcının tekil olarak sildiği öğeleri atla
                    if (silinenSet.contains("sys_$id")) {
                        continue
                    }

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

                    if (silinenSet.contains(displayTitle.lowercase().trim())) {
                        continue
                    }

                    var appName = pkg
                    try {
                        val appInfo = pm.getApplicationInfo(pkg, 0)
                        appName = pm.getApplicationLabel(appInfo).toString()
                    } catch (e: Exception) {}

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
                    item.putDouble("engagementTime", engTime.toDouble())

                    result.pushMap(item)
                    count++
                }
            } catch (e: Exception) {
            } finally {
                try { cursor.close() } catch (e: Exception) {}
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
                } catch (e: Exception) {}
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
                } catch (e: Exception) {}
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
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val pId = programId.toLong()
                val prefs = reactContext.getSharedPreferences("GS_LAUNCHER_PREFS", Context.MODE_PRIVATE)
                val currentSet = prefs.getStringSet("gs_silinen_devam_idler", HashSet())?.toMutableSet() ?: mutableSetOf()
                currentSet.add("sys_$pId")
                prefs.edit().putStringSet("gs_silinen_devam_idler", currentSet).apply()

                val uri = Uri.parse("content://android.media.tv/watch_next_program/$pId")
                var count = 0
                try {
                    count = reactContext.contentResolver.delete(uri, null, null)
                } catch (_: Exception) {}

                try {
                    val adb = LocalAdb(reactContext)
                    adb.runShell("content delete --uri content://android.media.tv/watch_next_program/$pId")
                } catch (_: Throwable) {}

                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
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
    fun clearAllWatchNextPrograms(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val prefs = reactContext.getSharedPreferences("GS_LAUNCHER_PREFS", Context.MODE_PRIVATE)
                prefs.edit()
                    .putLong("gs_son_devam_temizleme_zamani", System.currentTimeMillis())
                    .putStringSet("gs_silinen_devam_idler", emptySet())
                    .apply()

                val uri = Uri.parse("content://android.media.tv/watch_next_program")
                try {
                    reactContext.contentResolver.delete(
                        uri,
                        "package_name = ?",
                        arrayOf(reactContext.packageName)
                    )
                } catch (_: Exception) {}

                try {
                    reactContext.contentResolver.delete(uri, null, null)
                } catch (_: Exception) {}

                try {
                    val adb = LocalAdb(reactContext)
                    adb.runShell("content delete --uri content://android.media.tv/watch_next_program")
                } catch (_: Throwable) {}

                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
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
                        } catch (e: Exception) {}

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
        } catch (e: Exception) {}
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
                        } catch (e: Exception) {}

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
        } catch (e: Exception) {}
        promise.resolve(result)
    }
}
