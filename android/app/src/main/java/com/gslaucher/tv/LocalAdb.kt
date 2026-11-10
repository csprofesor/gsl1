package com.gslaucher.tv

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import dadb.AdbAuthException
import dadb.AdbConnectException
import dadb.AdbKeyPair
import dadb.AdbTimeoutException
import dadb.Dadb
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.IOException
import java.net.InetSocketAddress
import java.net.Socket

/**
 * GS Launcher Yerel ADB Yöneticisi (Matinee / Jarvis322 Paritesi).
 *
 * Cihazın kendi localhost:5555 portuna bağlanarak:
 * 1. ACCESS_RESTRICTED_SETTINGS kısıtlamasını kaldırır.
 * 2. WRITE_SECURE_SETTINGS iznini verir.
 * 3. TVAccessibilityService'i doğrudan sistem ayarlarında etkinleştirir.
 * 4. Uygulamayı pil/uyku optimizasyonlarından muaf tutar.
 */
class LocalAdb(context: Context) {

    private val appContext = context.applicationContext
    private val keyDir = File(appContext.filesDir, "adb")

    enum class SetupResult { DONE, ADB_OFF, NOT_ALLOWED, FAILED }

    fun isSetUp(): Boolean =
        appContext.checkSelfPermission(Manifest.permission.WRITE_SECURE_SETTINGS) == PackageManager.PERMISSION_GRANTED

    suspend fun setUp(): SetupResult = withContext(Dispatchers.IO) {
        val pkg = appContext.packageName
        val serviceComponent = ComponentName(appContext, TVAccessibilityService::class.java).flattenToString()
        val commands = buildList {
            add("pm grant $pkg ${Manifest.permission.WRITE_SECURE_SETTINGS}")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                add("appops set $pkg ACCESS_RESTRICTED_SETTINGS allow")
            }
            add("settings put secure enabled_accessibility_services $serviceComponent")
            add("settings put secure accessibility_enabled 1")
            add("dumpsys deviceidle whitelist +$pkg")
        }

        if (!isListening()) return@withContext SetupResult.ADB_OFF

        try {
            connect(SETUP_TIMEOUT_MS).use { adb ->
                commands.forEach { command ->
                    val response = adb.shell(command)
                    if (response.exitCode != 0) {
                        Log.w(TAG, "'$command' çıktı kodu: ${response.exitCode}: ${response.allOutput.trim()}")
                    }
                }
            }
            if (isSetUp()) SetupResult.DONE else SetupResult.FAILED
        } catch (e: AdbConnectException) {
            SetupResult.NOT_ALLOWED
        } catch (e: AdbAuthException) {
            SetupResult.NOT_ALLOWED
        } catch (e: AdbTimeoutException) {
            SetupResult.NOT_ALLOWED
        } catch (e: IOException) {
            Log.w(TAG, "adb kurulum hatası: ${e.message}")
            SetupResult.FAILED
        }
    }

    private fun isListening(): Boolean = try {
        Socket().use { it.connect(InetSocketAddress(HOST, PORT), CONNECT_TIMEOUT_MS) }
        true
    } catch (e: IOException) {
        false
    }

    private fun connect(timeoutMs: Int): Dadb {
        keyDir.mkdirs()
        val privateKey = File(keyDir, "adbkey")
        val publicKey = File(keyDir, "adbkey.pub")
        if (!privateKey.exists() || !publicKey.exists()) {
            AdbKeyPair.generate(privateKey, publicKey)
        }
        return Dadb.create(HOST, PORT, AdbKeyPair.read(privateKey, publicKey), CONNECT_TIMEOUT_MS, timeoutMs)
    }

    companion object {
        private const val TAG = "GSTV_LocalAdb"
        private const val HOST = "127.0.0.1"
        private const val PORT = 5555
        private const val CONNECT_TIMEOUT_MS = 3_000
        private const val SETUP_TIMEOUT_MS = 60_000
    }
}
