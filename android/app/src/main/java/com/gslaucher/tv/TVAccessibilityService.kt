package com.gslaucher.tv

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

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
            searchQueryExpiry = System.currentTimeMillis() + 20000L // 20 saniye boyunca ara
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        isServiceRunning = true
        // Kullanıcı Ayarlar ekranında açma/onaylama yaparken servisin hemen başlatıcıya dönmesini 60 sn engelle
        allowStockLauncherUntil = System.currentTimeMillis() + 60000L
    }

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
    }

    private fun findAndFillSearchBox(node: AccessibilityNodeInfo?, query: String): Boolean {
        if (node == null) return false
        try {
            val isEditable = node.isEditable
            val className = node.className?.toString() ?: ""
            val isSearchField = isEditable || className.contains("EditText", ignoreCase = true) || className.contains("SearchView", ignoreCase = true)

            if (isSearchField) {
                val args = Bundle()
                args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, query)
                val setSuccess = node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
                if (!setSuccess) {
                    node.performAction(AccessibilityNodeInfo.ACTION_PASTE)
                }
                return true
            }

            for (i in 0 until node.childCount) {
                val child = try { node.getChild(i) } catch (e: Throwable) { null }
                if (findAndFillSearchBox(child, query)) {
                    return true
                }
            }
        } catch (e: Throwable) {}
        return false
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        try {
            if (event == null) return

            val eventType = event.eventType
            val pkg = event.packageName?.toString() ?: return

            // Kendi uygulamamız ise işlem yapma
            if (pkg == packageName) return

            // Ayarlar, İzinler veya Sistem Arayüzü ise ASLA engelleme/müdahale etme
            if (IGNORED_SYSTEM_PACKAGES.contains(pkg) ||
                pkg.contains("settings", ignoreCase = true) ||
                pkg.contains("permission", ignoreCase = true) ||
                pkg.contains("packageinstaller", ignoreCase = true)
            ) {
                return
            }

            // 1. Hedef uygulamada arama kutusunu otomatik doldurma (Otomatik Arama Entegrasyonu)
            val query = lastSearchQuery
            val targetPkg = lastTargetPackage
            if (!query.isNullOrEmpty() && !targetPkg.isNullOrEmpty() && System.currentTimeMillis() < searchQueryExpiry) {
                if (pkg.lowercase().contains(targetPkg)) {
                    val rootNode = try { rootInActiveWindow ?: event.source } catch (e: Throwable) { null }
                    if (rootNode != null) {
                        try {
                            if (findAndFillSearchBox(rootNode, query)) {
                                lastSearchQuery = null // Bir defa doldurunca temizle
                            }
                        } catch (e: Throwable) {}
                    }
                }
            }

            // 2. Sistem orijinal ekrana dönmeye çalışırsa GS Launcher'ı öne getir
            if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
                if (System.currentTimeMillis() < allowStockLauncherUntil) {
                    return
                }

                if (STOCK_LAUNCHER_PACKAGES.contains(pkg)) {
                    val className = event.className?.toString() ?: ""
                    // Başlatıcı paketi altındaki ayarlar veya sistem diyaloglarını asla engelleme
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
            // Android sisteminin servisi kapatmasını önlemek için tüm istisnaları güvenle yut
        }
    }

    override fun onInterrupt() {
        isServiceRunning = false
    }
}
