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
        if (event == null) return

        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val pkg = event.packageName?.toString() ?: return

            // Kullanıcı ayarlardan "Orijinal Sisteme Dön" dediyse geçici olarak engelleme
            if (System.currentTimeMillis() < allowStockLauncherUntil) {
                return
            }

            // Sistem orijinal ekrana dönmeye çalışırsa GS Launcher'ı öne getir
            if (STOCK_LAUNCHER_PACKAGES.contains(pkg)) {
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
    }

    override fun onInterrupt() {}
}
