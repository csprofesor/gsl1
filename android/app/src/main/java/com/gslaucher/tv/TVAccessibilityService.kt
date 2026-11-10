package com.gslaucher.tv

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.os.SystemClock
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent

/**
 * Matinee (Jarvis322/matinee) mimarisiyle birebir paritede çalışan sabit başlatıcı servisi.
 *
 * TV'nin orijinal başlatıcısının Home tuşunu zorla almasını engeller:
 * 1. Donanımsal KEYCODE_HOME tuşunu input filtresi seviyesinde yakalar.
 * 2. Cihaz uyandığında veya bir uygulama kapandığında stock launcher penceresi
 *    öne gelirse (TYPE_WINDOW_STATE_CHANGED) GS Launcher'ı anında öne getirir.
 * 3. ':homekey' izole sürecinde çalışarak ana uygulamanın çökmesi veya RAM geri kazanımından
 *    etkilenmez; böylece Android sistemi erişilebilirlik anahtarını kendiliğinden kapatmaz!
 */
class TVAccessibilityService : AccessibilityService() {

    private var stockHomes: Set<ComponentName> = emptySet()
    private var lastOpenedAt = 0L

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

        @JvmStatic
        fun setAutoSearch(pkg: String, query: String) {
            lastTargetPackage = pkg.lowercase()
            lastSearchQuery = query
            searchQueryExpiry = System.currentTimeMillis() + 20_000L
        }

        private const val REOPEN_GUARD_MS = 1_000L
        private const val BOOT_WINDOW_MS = 2 * 60_000L
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        isServiceRunning = true
        stockHomes = stockHomeActivities()

        // Sadece orijinal TV başlatıcılarının pencere olaylarını dinle;
        // tüm ekran olaylarını dinleyip gereksiz IPC yükü ve sistem kill riskini önler.
        serviceInfo = (serviceInfo ?: AccessibilityServiceInfo()).apply {
            if (stockHomes.isEmpty()) {
                eventTypes = 0
            } else {
                eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                packageNames = stockHomes.map { it.packageName }.distinct().toTypedArray()
            }
            flags = flags or AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS
        }

        // TV açıldıktan sonra ilk boot penceresinde launcher'ı öne al
        if (SystemClock.elapsedRealtime() < BOOT_WINDOW_MS) {
            openLauncher()
        }
    }

    override fun onDestroy() {
        isServiceRunning = false
        super.onDestroy()
    }

    override fun onKeyEvent(event: KeyEvent): Boolean {
        // Matinee paritesi: KEYCODE_HOME yakalama
        if (event.keyCode == KeyEvent.KEYCODE_HOME) {
            if (event.action == KeyEvent.ACTION_UP && !event.isCanceled) {
                // Kullanıcı ayarlardan 'Orijinal TV Başlatıcısına Geçici Dönüş' talep etmişse engelleme
                if (System.currentTimeMillis() >= allowStockLauncherUntil) {
                    openLauncher()
                }
            }
            return true // Olayı tüket; sistemin orijinal başlatıcıyı açmasını donanımsal düzeyde engelle!
        }
        return false
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        try {
            if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
            val pkg = event.packageName?.toString() ?: return
            val cls = event.className?.toString() ?: return

            // Kendi penceremiz ise işlem yapma
            if (pkg == packageName) return

            // Kullanıcı ayarlardan geçici izin vermişse müdahale etme
            if (System.currentTimeMillis() < allowStockLauncherUntil) return

            val shown = ComponentName(pkg, cls)
            if (shown in stockHomes) {
                openLauncher()
            }
        } catch (e: Throwable) {
        }
    }

    private fun openLauncher() {
        val now = SystemClock.elapsedRealtime()
        if (now - lastOpenedAt < REOPEN_GUARD_MS) return
        lastOpenedAt = now

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: Intent(this, MainActivity::class.java)
        launchIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
        )
        try {
            startActivity(launchIntent)
        } catch (e: Throwable) {
        }
    }

    private fun stockHomeActivities(): Set<ComponentName> {
        val appListEntries = listOf(Intent.CATEGORY_LAUNCHER, Intent.CATEGORY_LEANBACK_LAUNCHER)
            .flatMap { activities(it) }
            .map { it.component }
            .toSet()

        return activities(Intent.CATEGORY_HOME)
            .filter { it.priority >= 0 && it.activityInfo.packageName != packageName }
            .map { it.component }
            .filterNot { it in appListEntries }
            .toSet()
    }

    private fun activities(category: String): List<ResolveInfo> =
        packageManager.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(category), PackageManager.MATCH_ALL)

    private val ResolveInfo.component get() = ComponentName(activityInfo.packageName, activityInfo.name)

    override fun onInterrupt() {
        isServiceRunning = false
    }
}
