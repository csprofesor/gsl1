package com.gslaucher.tv

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

class TVAccessibilityService : AccessibilityService() {

    companion object {
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

        // Bilinen sistem başlatıcıları (Mi Box, Google TV, Android TV)
        val STOCK_LAUNCHER_PACKAGES = setOf(
            "com.google.android.tvlauncher",
            "com.google.android.apps.tv.launcherx",
            "com.mitv.tvhome",
            "com.xiaomi.mitv.tvhome",
            "com.xiaomi.mitv.tvbox.launcher",
            "com.android.launcher3",
            "com.android.launcher",
            "com.amazon.firehomelauncher"
        )

        // Asla müdahale edilmemesi gereken sistem ve ayar paketleri
        val IGNORED_SYSTEM_PACKAGES = setOf(
            "com.android.tv.settings",
            "com.android.settings",
            "com.google.android.tv.frameworkpackagestubs",
            "com.google.android.packageinstaller",
            "com.android.packageinstaller",
            "android",
            "com.android.systemui",
            "com.google.android.permissioncontroller",
            "com.android.permissioncontroller"
        )

        fun setAutoSearch(pkg: String, query: String) {
            lastTargetPackage = pkg.lowercase()
            lastSearchQuery = query
            searchQueryExpiry = System.currentTimeMillis() + 20000L
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        isServiceRunning = true
    }

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
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
            // Android sisteminin servisi kapatmasını önlemek için tüm istisnaları yut
        }
    }

    override fun onInterrupt() {
        isServiceRunning = false
    }
}
