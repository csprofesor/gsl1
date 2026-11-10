package com.gslaucher.tv

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == "android.intent.action.QUICKBOOT_POWERON" ||
            action == "com.htc.intent.action.QUICKBOOT_POWERON") {

            val prefs = context.getSharedPreferences("GS_LAUNCHER_PREFS", Context.MODE_PRIVATE)
            val otoBaslatRaw = prefs.getString("otoBaslatmaEtkin", "true") ?: "true"
            val gecikmeRaw = prefs.getString("otoBaslatmaGecikmeSaniye", "0") ?: "0"
            val otoBaslat = otoBaslatRaw == "true"
            val gecikmeSaniye = gecikmeRaw.toIntOrNull() ?: 0

            if (otoBaslat) {
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
                if (launchIntent != null) {
                    if (gecikmeSaniye > 0) {
                        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                            try {
                                context.startActivity(launchIntent)
                            } catch (e: Exception) {}
                        }, (gecikmeSaniye * 1000).toLong())
                    } else {
                        try {
                            context.startActivity(launchIntent)
                        } catch (e: Exception) {}
                    }
                }
            }
        }
    }
}
