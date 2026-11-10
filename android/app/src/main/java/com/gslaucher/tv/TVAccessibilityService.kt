package com.gslaucher.tv

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.os.Build
import android.os.SystemClock
import android.util.Log
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent

/**
 * Android TV ve Xiaomi Mi Box için Sabit Başlatıcı Erişilebilirlik Hizmeti.
 *
 * TV'nin orijinal başlatıcısının Home tuşunu zorla almasını engeller:
 * 1. Donanımsal KEYCODE_HOME tuşunu input filtresi seviyesinde yakalar.
 * 2. Cihaz uyandığında veya bir uygulama kapandığında stock launcher penceresi
 *    öne gelirse (TYPE_WINDOW_STATE_CHANGED) GS Launcher'ı anında öne getirir.
 * 3. Hata korumalı yaşam döngüsü ve detaylı Logcat teşhisi ile sistem tarafından
 *    kendi kendine kapatılma veya anahtarın geri atması önlenir.
 */
class TVAccessibilityService : AccessibilityService() {

    private var stockHomes: Set<ComponentName> = emptySet()
    private var lastOpenedAt = 0L

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

        @JvmStatic
        fun setAutoSearch(pkg: String, query: String) {
            lastTargetPackage = pkg.lowercase()
            lastSearchQuery = query
            searchQueryExpiry = System.currentTimeMillis() + 20_000L
        }

        private const val REOPEN_GUARD_MS = 1_000L
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "onCreate: TVAccessibilityService oluşturuldu.")
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        try {
            isServiceRunning = true
            Log.i(TAG, "onServiceConnected: Sabit başlatıcı servisi sisteme bağlandı.")

            // ServiceInfo ayarlarını dinamik olarak pekiştir (canRetrieveWindowContent=false ile uyumlu)
            val info = serviceInfo ?: AccessibilityServiceInfo()
            info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            info.flags = AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS
            info.notificationTimeout = 50
            serviceInfo = info

            Log.i(TAG, "onServiceConnected: ServiceInfo başarıyla güncellendi (flags=${info.flags}, feedbackType=${info.feedbackType})")

            // Stock home aktivitelerini arka planda tara (onServiceConnected ana iş parçacığını asla bloke etmemeli)
            Thread {
                try {
                    stockHomes = stockHomeActivities()
                } catch (e: Throwable) {
                    Log.w(TAG, "Arka plan stockHomes taraması tamamlanamadı: ${e.message}")
                }
            }.start()
        } catch (e: Throwable) {
            Log.e(TAG, "onServiceConnected sırasında hata oluştu!", e)
        }
    }

    override fun onUnbind(intent: Intent?): Boolean {
        isServiceRunning = false
        Log.w(TAG, "onUnbind: Servis sistem tarafından çözüldü (unbound).")
        return super.onUnbind(intent)
    }

    override fun onInterrupt() {
        isServiceRunning = false
        Log.w(TAG, "onInterrupt: Erişilebilirlik servisi kesintiye uğradı.")
    }

    override fun onDestroy() {
        isServiceRunning = false
        Log.i(TAG, "onDestroy: Erişilebilirlik servisi yok edildi.")
        super.onDestroy()
    }

    override fun onKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_HOME) {
            if (event.action == KeyEvent.ACTION_UP && !event.isCanceled) {
                // Kullanıcı ayarlardan 'Orijinal TV Başlatıcısına Geçici Dönüş' talep etmişse engelleme
                if (System.currentTimeMillis() >= allowStockLauncherUntil) {
                    Log.d(TAG, "onKeyEvent: KEYCODE_HOME yakalandı -> GS Launcher öne getiriliyor.")
                    openLauncher()
                } else {
                    Log.d(TAG, "onKeyEvent: KEYCODE_HOME serbest bırakıldı (Geçici stock launcher izni aktif).")
                }
            }
            return true // Olayı tüket; sistemin orijinal başlatıcıyı açmasını donanımsal düzeyde engelle!
        }
        return false
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        try {
            if (event == null || event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
            val pkg = event.packageName?.toString() ?: return
            val cls = event.className?.toString() ?: ""

            // Kendi penceremiz ise işlem yapma
            if (pkg == packageName) return

            // Kullanıcı ayarlardan geçici izin vermişse müdahale etme
            if (System.currentTimeMillis() < allowStockLauncherUntil) return

            val shown = ComponentName(pkg, cls)
            if (shown in stockHomes || STOCK_LAUNCHER_PACKAGES.contains(pkg)) {
                Log.d(TAG, "onAccessibilityEvent: Stock başlatıcı penceresi tespit edildi ($pkg / $cls) -> GS Launcher öne alınıyor.")
                openLauncher()
            }
        } catch (e: Throwable) {
            Log.e(TAG, "onAccessibilityEvent işlenirken hata oluştu!", e)
        }
    }

    private fun openLauncher() {
        val now = SystemClock.elapsedRealtime()
        if (now - lastOpenedAt < REOPEN_GUARD_MS) return
        lastOpenedAt = now

        try {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: Intent(this, MainActivity::class.java)
            launchIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
            startActivity(launchIntent)
        } catch (e: Throwable) {
            Log.e(TAG, "openLauncher: Launcher başlatılırken hata oluştu!", e)
        }
    }

    private fun stockHomeActivities(): Set<ComponentName> {
        return try {
            val appListEntries = mutableSetOf<ComponentName>()
            listOf(Intent.CATEGORY_LAUNCHER, Intent.CATEGORY_LEANBACK_LAUNCHER).forEach { cat ->
                activities(cat).forEach { rInfo ->
                    val act = rInfo.activityInfo ?: return@forEach
                    val pName = act.packageName ?: return@forEach
                    val aName = act.name ?: return@forEach
                    appListEntries.add(ComponentName(pName, aName))
                }
            }

            val homeEntries = mutableSetOf<ComponentName>()
            activities(Intent.CATEGORY_HOME).forEach { rInfo ->
                val act = rInfo.activityInfo ?: return@forEach
                val pName = act.packageName ?: return@forEach
                val aName = act.name ?: return@forEach
                val comp = ComponentName(pName, aName)

                if (rInfo.priority >= 0 && pName != packageName && !appListEntries.contains(comp)) {
                    homeEntries.add(comp)
                }
            }
            Log.i(TAG, "stockHomeActivities: ${homeEntries.size} adet sistem ana ekranı bulundu: $homeEntries")
            homeEntries
        } catch (e: Throwable) {
            Log.e(TAG, "stockHomeActivities taranırken hata, yerleşik paket listesi kullanılacak.", e)
            emptySet()
        }
    }

    private fun activities(category: String): List<ResolveInfo> {
        return try {
            val intent = Intent(Intent.ACTION_MAIN).addCategory(category)
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PackageManager.MATCH_ALL
            } else {
                0
            }
            packageManager.queryIntentActivities(intent, flags) ?: emptyList()
        } catch (e: Throwable) {
            Log.w(TAG, "activities sorgusu başarısız oldu (category=$category): ${e.message}")
            emptyList()
        }
    }
}
