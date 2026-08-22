package com.example.bridge

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import com.example.security.SecurityHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

class TendaNativeBridge(
    private val context: Context,
    private val webView: WebView
) {
    companion object {
        private const val TAG = "TendaNativeBridge"
    }

    private val securityHelper = SecurityHelper(context)
    private val scope = CoroutineScope(Dispatchers.IO)
    private val cookieStore = ConcurrentHashMap<String, MutableList<Cookie>>()

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .writeTimeout(12, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .cookieJar(object : CookieJar {
            override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
                val host = url.host
                val list = cookieStore.getOrPut(host) { mutableListOf() }
                synchronized(list) {
                    list.removeAll { newCookie -> cookies.any { it.name == newCookie.name } }
                    list.addAll(cookies)
                }
            }

            override fun loadForRequest(url: HttpUrl): List<Cookie> {
                val host = url.host
                return cookieStore[host] ?: emptyList()
            }
        })
        .build()

    @JavascriptInterface
    fun routerRequest(requestId: String, configJson: String) {
        executeRequestInternal(requestId, configJson)
    }

    @JavascriptInterface
    fun performHttpRequest(requestId: String, configJson: String) {
        executeRequestInternal(requestId, configJson)
    }

    private fun executeRequestInternal(requestId: String, configJson: String) {
        scope.launch {
            try {
                val config = JSONObject(configJson)
                val url = config.getString("url")
                val method = config.optString("method", "GET").uppercase()
                val headersObj = config.optJSONObject("headers")
                val cookiesObj = config.optJSONObject("cookies")
                val bodyStr = config.optString("body", "")

                // Safe diagnostic logging (no passwords/cookies/tokens logged)
                val safePath = try {
                    val parsedUrl = url.toHttpUrlOrNull()
                    "${parsedUrl?.host}:${parsedUrl?.port}${parsedUrl?.encodedPath}"
                } catch (e: Exception) {
                    url
                }
                Log.d(TAG, "Router Request: $method $safePath (ID: $requestId)")

                val requestBuilder = Request.Builder().url(url)

                // Add standard browser headers
                requestBuilder.addHeader("User-Agent", "Mozilla/5.0 (Android; Mobile; TendaRouterManager)")
                requestBuilder.addHeader("X-Requested-With", "XMLHttpRequest")

                // Add custom headers
                headersObj?.let {
                    val keys = it.keys()
                    while (keys.hasNext()) {
                        val k = keys.next()
                        requestBuilder.addHeader(k, it.getString(k))
                    }
                }

                // Add explicit cookies if provided
                cookiesObj?.let {
                    val cookieList = mutableListOf<String>()
                    val keys = it.keys()
                    while (keys.hasNext()) {
                        val k = keys.next()
                        cookieList.add("$k=${it.getString(k)}")
                    }
                    if (cookieList.isNotEmpty()) {
                        requestBuilder.addHeader("Cookie", cookieList.joinToString("; "))
                    }
                }

                if (method == "POST" || method == "PUT") {
                    val contentType = headersObj?.optString("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
                        ?: "application/x-www-form-urlencoded; charset=UTF-8"
                    val requestBody = bodyStr.toRequestBody(contentType.toMediaTypeOrNull())
                    requestBuilder.method(method, requestBody)
                } else {
                    requestBuilder.method(method, null)
                }

                val response = okHttpClient.newCall(requestBuilder.build()).execute()
                val responseBody = response.body?.string() ?: ""
                val responseHeaders = JSONObject()
                val responseCookies = JSONObject()

                for ((name, value) in response.headers) {
                    responseHeaders.put(name, value)
                    if (name.equals("Set-Cookie", ignoreCase = true)) {
                        val parts = value.split(";").firstOrNull()?.split("=")
                        if (parts != null && parts.size >= 2) {
                            responseCookies.put(parts[0].trim(), parts[1].trim())
                        }
                    }
                }

                Log.d(TAG, "Router Response: $method $safePath -> Code ${response.code} (bytes: ${responseBody.length})")

                val resultJson = JSONObject().apply {
                    put("requestId", requestId)
                    put("statusCode", response.code)
                    put("body", responseBody)
                    put("headers", responseHeaders)
                    put("cookies", responseCookies)
                    put("isSuccess", response.isSuccessful)
                }

                sendResultToWeb(resultJson.toString())
            } catch (e: Exception) {
                Log.e(TAG, "Router Request Error: ${e.message}")
                val errorJson = JSONObject().apply {
                    put("requestId", requestId)
                    put("statusCode", 0)
                    put("body", "")
                    put("error", e.message ?: "Router connection failed or timed out")
                    put("isSuccess", false)
                }
                sendResultToWeb(errorJson.toString())
            }
        }
    }

    private fun sendResultToWeb(jsonString: String) {
        val escaped = jsonString
            .replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", "\\n")
            .replace("\r", "\\r")

        webView.post {
            webView.evaluateJavascript("window.__tendaNativeRequestCallback && window.__tendaNativeRequestCallback('$escaped');", null)
        }
    }

    @JavascriptInterface
    fun secureStore(key: String, value: String): Boolean {
        return try {
            securityHelper.encryptAndStore(key, value)
            true
        } catch (e: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun secureRetrieve(key: String): String? {
        return try {
            securityHelper.retrieveAndDecrypt(key)
        } catch (e: Exception) {
            null
        }
    }

    @JavascriptInterface
    fun deleteSecureData(key: String): Boolean {
        return try {
            securityHelper.remove(key)
            true
        } catch (e: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun secureDelete(key: String): Boolean {
        return deleteSecureData(key)
    }

    @JavascriptInterface
    fun detectGateway(): String {
        return try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val dhcpInfo = wifiManager?.dhcpInfo

            var gatewayIp = "192.168.0.1"
            var ipAddress = "192.168.0.100"

            if (dhcpInfo != null && dhcpInfo.gateway != 0) {
                gatewayIp = intToIp(dhcpInfo.gateway)
                ipAddress = intToIp(dhcpInfo.ipAddress)
            }

            var ssid = wifiManager?.connectionInfo?.ssid?.replace("\"", "") ?: "Wi-Fi Network"
            if (ssid == "<unknown ssid>") ssid = "Local Tenda Wi-Fi"

            JSONObject().apply {
                put("gatewayIp", gatewayIp)
                put("deviceIp", ipAddress)
                put("ssid", ssid)
                put("isWifi", true)
            }.toString()
        } catch (e: Exception) {
            JSONObject().apply {
                put("gatewayIp", "192.168.0.1")
                put("deviceIp", "192.168.0.100")
                put("ssid", "Local Tenda Wi-Fi")
                put("isWifi", true)
            }.toString()
        }
    }

    private fun intToIp(i: Int): String {
        return (i and 0xFF).toString() + "." +
                ((i shr 8) and 0xFF) + "." +
                ((i shr 16) and 0xFF) + "." +
                ((i shr 24) and 0xFF)
    }

    @JavascriptInterface
    fun getNetworkState(): String {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        val network = cm?.activeNetwork
        val caps = cm?.getNetworkCapabilities(network)

        val isConnected = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true ||
                caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
        val isWifi = caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true

        return JSONObject().apply {
            put("isConnected", isConnected)
            put("isWifi", isWifi)
            put("ssid", "Tenda Wi-Fi")
        }.toString()
    }

    @JavascriptInterface
    fun showToast(message: String) {
        webView.post {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        }
    }

    @JavascriptInterface
    fun copyToClipboard(text: String): Boolean {
        return try {
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
            val clip = ClipData.newPlainText("Tenda", text)
            clipboard?.setPrimaryClip(clip)
            true
        } catch (e: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun getAppInfo(): String {
        return JSONObject().apply {
            put("appName", "Tenda Router Manager")
            put("version", "1.0.0 (NH MAIM)")
            put("author", "NH MAIM")
        }.toString()
    }

    @JavascriptInterface
    fun vibrate(durationMs: Long) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator?.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                @Suppress("DEPRECATION")
                vibrator?.vibrate(durationMs)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @JavascriptInterface
    fun getAppVersion(): String {
        return "1.0.0 (NH MAIM)"
    }
}
