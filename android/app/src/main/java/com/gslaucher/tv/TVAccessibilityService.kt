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

        fun setAutoSearch(pkg: String, query: String) {
            lastTargetPackage = pkg.lowercase()
            lastSearchQuery = query
            searchQueryExpiry = System.currentTimeMillis() + 20000L // 20 saniye boyunca ara
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        try {
            val info = serviceInfo ?: android.accessibilityservice.AccessibilityServiceInfo()
            info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            info.feedbackType = android.accessibilityservice.AccessibilityServiceInfo.FEEDBACK_GENERIC
            info.notificationTimeout = 100
            info.flags = android.accessibilityservice.AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS or
                         android.accessibilityservice.AccessibilityServiceInfo.DEFAULT
            serviceInfo = info
        } catch (e: Exception) {}
        isServiceRunning = true
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
                val child = node.getChild(i)
                if (findAndFillSearchBox(child, query)) {
                    return true
                }
            }
        } catch (e: Exception) {}
        return false
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val eventType = event.eventType
        val pkg = event.packageName?.toString() ?: return

        // 1. Hedef uygulamada arama kutusunu otomatik doldurma (Otomatik Arama Entegrasyonu)
        val query = lastSearchQuery
        if (!query.isNullOrEmpty() && System.currentTimeMillis() < searchQueryExpiry) {
            val targetPkg = lastTargetPackage
            if (targetPkg != null && pkg.lowercase().contains(targetPkg)) {
                val rootNode = rootInActiveWindow ?: event.source
                if (rootNode != null) {
                    if (findAndFillSearchBox(rootNode, query)) {
                        lastSearchQuery = null // Bir defa doldurunca temizle
                    }
                }
            }
        }

        // 2. Sistem orijinal ekrana dönmeye çalışırsa GS Launcher'ı öne getir
        if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            if (System.currentTimeMillis() < allowStockLauncherUntil) {
                return
            }

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
