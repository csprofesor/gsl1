package com.gslaucher.tv

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.i(TAG, "BootReceiver tetiklendi: $action")

        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_LOCKED_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == "android.intent.action.QUICKBOOT_POWERON" ||
            action == "com.htc.intent.action.QUICKBOOT_POWERON") {

            val prefs = context.getSharedPreferences("GS_LAUNCHER_PREFS", Context.MODE_PRIVATE)
            val otoBaslatRaw = prefs.getString("otoBaslatmaEtkin", "true") ?: "true"
            val otoBaslat = otoBaslatRaw == "true"

            if (otoBaslat) {
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP
                    )
                }

                if (launchIntent != null) {
                    // 1. İlk anında başlatma
                    try {
                        context.startActivity(launchIntent)
                    } catch (e: Exception) {
                        Log.e(TAG, "İlk başlatma hatası", e)
                    }

                    // 2. Android TV / Mi Box sistem servisleri ve stock launcher gecikmeli açıldığında
                    // GS Launcher'ın ön planda kalmasını garantilemek için 2.5 ve 5. saniyelerde tekrar kontrol et
                    val handler = Handler(Looper.getMainLooper())
                    handler.postDelayed({
                        try {
                            context.startActivity(launchIntent)
                        } catch (_: Exception) {}
                    }, 2500L)

                    handler.postDelayed({
                        try {
                            context.startActivity(launchIntent)
                        } catch (_: Exception) {}
                    }, 5000L)
                }
            }
        }
    }

    companion object {
        private const val TAG = "GSTV_BootReceiver"
    }
}
