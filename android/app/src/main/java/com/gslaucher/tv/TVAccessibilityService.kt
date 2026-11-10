package com.gslaucher.tv

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent

/**
 * Android TV ve Xiaomi Mi Box için Sabit Başlatıcı Erişilebilirlik Hizmeti.
 *
 * v3.2.16 sürümündeki sorunsuz ve anında açılan hafif mimari:
 * 1. Donanımsal tuş filtreleme (canRequestFilterKeyEvents) ve ekran okuyucu (canRetrieveWindowContent)
 *    talep etmez; böylece Xiaomi Mi Box ve Android TV'nin kısıtlama mekanizmalarına takılmaz.
 * 2. Cihaz uyandığında, Home tuşuna basıldığında veya bir uygulama kapandığında stock launcher penceresi
 *    öne gelirse (TYPE_WINDOW_STATE_CHANGED) GS Launcher'ı anında öne getirir.
 * 3. TV Ayarları ve izin diyaloglarına asla müdahale etmez; anahtar açıldığında asla geri kapanmaz.
 */
class TVAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "GSTV_Accessibility"

        @Volatile
        var isServiceRunning = false

        @Volatile
        var allowStockLauncherUntil: Long = 0L

        @Volatile
        var lastTargetPackage: String? = null

        @Volatile
        var lastSearchQuery: String? = null

        @Volatile
        var searchQueryExpiry: Long = 0L

        // Bilinen tüm Android TV ve Mi Box sistem başlatıcıları
        val STOCK_LAUNCHER_PACKAGES = setOf(
            "com.google.android.tvlauncher",
            "com.google.android.apps.tv.launcherx",
            "com.mitv.tvhome",
            "com.xiaomi.mitv.tvhome",
            "com.xiaomi.mitv.tvbox.launcher",
            "com.android.launcher3",
            "com.android.launcher",
            "com.amazon.firehomelauncher",
            "com.android.tv.home"
        )

        // Asla müdahale edilmemesi gereken sistem ve ayar paketleri
        val IGNORED_SYSTEM_PACKAGES = setOf(
            "com.android.tv.settings",
            "com.android.settings",
            "com.xiaomi.mitv.settings",
            "com.google.android.tv.frameworkpackagestubs",
            "com.google.android.packageinstaller",
            "com.android.packageinstaller",
            "android",
            "com.android.systemui",
            "com.google.android.permissioncontroller",
            "com.android.permissioncontroller"
        )

        @JvmStatic
        fun setAutoSearch(pkg: String, query: String) {
            lastTargetPackage = pkg.lowercase()
            lastSearchQuery = query
            searchQueryExpiry = System.currentTimeMillis() + 20_000L
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        isServiceRunning = true
        Log.i(TAG, "onServiceConnected: Sabit başlatıcı servisi başarıyla bağlandı ve aktif tutuluyor.")
    }

    override fun onDestroy() {
        isServiceRunning = false
        Log.i(TAG, "onDestroy: Sabit başlatıcı servisi durduruldu.")
        super.onDestroy()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        try {
            if (event == null) return

            if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
                val pkg = event.packageName?.toString() ?: return

                // Kendi uygulamamız ise işlem yapma
                if (pkg == packageName) return

                // Ayarlar, İzinler veya Sistem Arayüzü ise ASLA engelleme
                if (IGNORED_SYSTEM_PACKAGES.contains(pkg) ||
                    pkg.contains("settings", ignoreCase = true) ||
                    pkg.contains("permission", ignoreCase = true) ||
                    pkg.contains("packageinstaller", ignoreCase = true)
                ) {
                    return
                }

                // Kullanıcı ayarlardan "Orijinal Sisteme Dön" dediyse geçici olarak engelleme
                if (System.currentTimeMillis() < allowStockLauncherUntil) {
                    return
                }

                // Sistem orijinal ekrana dönmeye çalışırsa GS Launcher'ı öne getir
                if (STOCK_LAUNCHER_PACKAGES.contains(pkg)) {
                    val className = event.className?.toString() ?: ""
                    if (className.contains("Settings", ignoreCase = true) ||
                        className.contains("Dialog", ignoreCase = true) ||
                        className.contains("Preference", ignoreCase = true)
                    ) {
                        return
                    }

                    Log.d(TAG, "Stock başlatıcı penceresi tespit edildi ($pkg) -> GS Launcher öne alınıyor.")
                    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                    if (launchIntent != null) {
                        launchIntent.addFlags(
                            Intent.FLAG_ACTIVITY_NEW_TASK or
                            Intent.FLAG_ACTIVITY_CLEAR_TOP or
                            Intent.FLAG_ACTIVITY_SINGLE_TOP
                        )
                        startActivity(launchIntent)
                    }
                }
            }
        } catch (t: Throwable) {
            Log.e(TAG, "onAccessibilityEvent hatası", t)
        }
    }

    override fun onInterrupt() {
        isServiceRunning = false
    }
}
