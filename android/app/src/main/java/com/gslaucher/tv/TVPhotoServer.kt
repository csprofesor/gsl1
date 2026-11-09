package com.gslaucher.tv

import android.content.Context
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.*
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.util.concurrent.Executors

class TVPhotoServer(
    private val context: Context,
    private val port: Int = 8888,
    private val onPhotosChanged: () -> Unit
) {
    private var serverSocket: ServerSocket? = null
    private var isRunning = false
    private val executor = Executors.newFixedThreadPool(4)

    val photosDir: File by lazy {
        val dir = File(context.filesDir, "screensaver_photos")
        if (!dir.exists()) {
            dir.mkdirs()
        }
        dir
    }

    fun start() {
        if (isRunning) return
        isRunning = true
        Thread {
            try {
                serverSocket = ServerSocket(port)
                while (isRunning) {
                    try {
                        val client = serverSocket?.accept() ?: break
                        executor.execute { handleClient(client) }
                    } catch (e: Exception) {
                        break
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                isRunning = false
            }
        }.start()
    }

    fun stop() {
        isRunning = false
        try {
            serverSocket?.close()
        } catch (e: Exception) {}
        serverSocket = null
    }

    private fun handleClient(socket: Socket) {
        try {
            socket.soTimeout = 30000
            val input = socket.getInputStream()
            val output = socket.getOutputStream()
            val reader = BufferedReader(InputStreamReader(input, Charsets.UTF_8))

            val requestLine = reader.readLine() ?: return
            val parts = requestLine.split(" ")
            if (parts.size < 2) return

            val method = parts[0].uppercase()
            val rawPath = parts[1]

            // Headers okuma
            var contentLength = 0
            var contentType = ""
            var line: String? = reader.readLine()
            while (!line.isNullOrEmpty()) {
                val lower = line.lowercase()
                if (lower.startsWith("content-length:")) {
                    contentLength = line.substring(15).trim().toIntOrNull() ?: 0
                } else if (lower.startsWith("content-type:")) {
                    contentType = line.substring(13).trim()
                }
                line = reader.readLine()
            }

            val path = if (rawPath.contains("?")) rawPath.substring(0, rawPath.indexOf("?")) else rawPath
            val query = if (rawPath.contains("?")) rawPath.substring(rawPath.indexOf("?") + 1) else ""

            when {
                method == "GET" && (path == "/" || path == "/index.html") -> {
                    serveHtmlPage(output)
                }
                method == "GET" && path == "/api/photos" -> {
                    servePhotosJson(output)
                }
                method == "GET" && path == "/photo" -> {
                    servePhotoFile(query, output)
                }
                method == "POST" && path == "/api/upload" -> {
                    handleUpload(reader, contentLength, output)
                }
                method == "POST" && path == "/api/delete" -> {
                    handleDelete(query, output)
                }
                method == "POST" && path == "/api/clear" -> {
                    handleClear(output)
                }
                else -> {
                    sendResponse(output, 404, "Not Found", "Sayfa bulunamadı.")
                }
            }
        } catch (e: Exception) {
        } finally {
            try {
                socket.close()
            } catch (e: Exception) {}
        }
    }

    private fun serveHtmlPage(output: OutputStream) {
        val html = """
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>GS TV - Aile Fotoğrafları Yükleyici</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background: #0b1120; color: #f8fafc; min-height: 100vh; padding: 20px 16px; }
    .container { max-width: 540px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 24px; padding-top: 10px; }
    .logo-badge { display: inline-block; background: #38bdf8; color: #0b1120; font-weight: 900; font-size: 13px; padding: 4px 12px; border-radius: 20px; margin-bottom: 8px; letter-spacing: 1px; }
    h1 { font-size: 24px; font-weight: 800; color: #ffffff; margin-bottom: 6px; }
    p.desc { font-size: 14px; color: #94a3b8; line-height: 1.5; }
    
    .card { background: #1e293b; border-radius: 16px; padding: 20px; border: 1px solid #334155; margin-bottom: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    .upload-box { border: 2px dashed #38bdf8; border-radius: 12px; padding: 24px 16px; text-align: center; cursor: pointer; background: rgba(56, 189, 248, 0.05); transition: 0.2s; }
    .upload-box:active { background: rgba(56, 189, 248, 0.15); transform: scale(0.99); }
    .upload-icon { font-size: 40px; margin-bottom: 8px; }
    .upload-title { font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 4px; }
    .upload-sub { font-size: 12px; color: #64748b; }
    
    .btn { display: block; width: 100%; border: none; padding: 14px; border-radius: 12px; font-size: 15px; font-weight: 800; cursor: pointer; transition: 0.2s; margin-top: 14px; text-align: center; }
    .btn-primary { background: #38bdf8; color: #0b1120; }
    .btn-primary:disabled { background: #475569; color: #94a3b8; cursor: not-allowed; }
    .btn-danger { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; font-size: 13px; padding: 8px 12px; border-radius: 8px; margin-top: 0; }
    
    .progress-bar { height: 8px; background: #334155; border-radius: 4px; overflow: hidden; margin-top: 14px; display: none; }
    .progress-fill { height: 100%; background: #38bdf8; width: 0%; transition: width 0.2s; }
    .status-text { text-align: center; font-size: 13px; color: #38bdf8; margin-top: 8px; font-weight: 600; min-height: 20px; }
    
    .gallery-title { font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
    .gallery-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .gallery-item { position: relative; border-radius: 10px; overflow: hidden; background: #0f172a; aspect-ratio: 16/9; border: 1px solid #334155; }
    .gallery-item img { width: 100%; height: 100%; object-fit: cover; }
    .gallery-item .del-btn { position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.7); border: none; color: #ef4444; width: 28px; height: 28px; border-radius: 50%; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .empty-gallery { text-align: center; padding: 24px 0; color: #64748b; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">GS TV LAUNCHER</div>
      <h1>📸 Aile & Anı Fotoğrafları</h1>
      <p class="desc">Televizyonunuzun uyku modunda gösterilmesini istediğiniz aile, eş, çocuk veya manzara fotoğraflarını seçip yükleyin.</p>
    </div>

    <div class="card">
      <div class="upload-box" onclick="document.getElementById('fileInput').click()">
        <div class="upload-icon">🖼️</div>
        <div class="upload-title">Telefonunuzdan Fotoğraf Seçin</div>
        <div class="upload-sub">Galeri veya Kameradan (Birden fazla seçilebilir)</div>
        <input type="file" id="fileInput" multiple accept="image/*" style="display:none" onchange="onFilesSelected(event)">
      </div>

      <div class="progress-bar" id="progressBar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      <div class="status-text" id="statusText"></div>

      <button class="btn btn-primary" id="uploadBtn" disabled onclick="startUpload()">
        🚀 Seçilenleri Televizyona Gönder
      </button>
    </div>

    <div class="card">
      <div class="gallery-title">
        <span>📺 Televizyondaki Fotoğraflar (<span id="photoCount">0</span>)</span>
        <button class="btn-danger" onclick="clearAllPhotos()">Tümünü Sil</button>
      </div>
      <div class="gallery-grid" id="galleryGrid">
        <div class="empty-gallery">Yükleniyor...</div>
      </div>
    </div>
  </div>

  <script>
    let selectedFiles = [];

    function onFilesSelected(event) {
      selectedFiles = Array.from(event.target.files);
      const btn = document.getElementById('uploadBtn');
      const status = document.getElementById('statusText');
      if (selectedFiles.length > 0) {
        btn.disabled = false;
        btn.innerText = '🚀 ' + selectedFiles.length + ' Fotoğrafı Televizyona Gönder';
        status.innerText = selectedFiles.length + ' adet fotoğraf seçildi.';
      } else {
        btn.disabled = true;
        btn.innerText = '🚀 Seçilenleri Televizyona Gönder';
        status.innerText = '';
      }
    }

    async function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // Görüntüyü tarayıcıda optimize et (Çok büyük 50MB RAW fotoğrafları 2560px'e ölçekleyip hızlı aktarır)
    async function compressImage(file) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 2560;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        };
        img.onerror = async () => {
          resolve(await fileToBase64(file));
        };
        img.src = URL.createObjectURL(file);
      });
    }

    async function startUpload() {
      if (selectedFiles.length === 0) return;
      const btn = document.getElementById('uploadBtn');
      const pBar = document.getElementById('progressBar');
      const pFill = document.getElementById('progressFill');
      const status = document.getElementById('statusText');

      btn.disabled = true;
      pBar.style.display = 'block';

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const pct = Math.round(((i) / selectedFiles.length) * 100);
        pFill.style.width = pct + '%';
        status.innerText = 'Yükleniyor (' + (i + 1) + '/' + selectedFiles.length + '): ' + file.name;

        try {
          const base64Data = await compressImage(file);
          await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: file.name, data: base64Data })
          });
        } catch (err) {
          console.error(err);
        }
      }

      pFill.style.width = '100%';
      status.innerText = '✔ ' + selectedFiles.length + ' fotoğraf başarıyla televizyona yüklendi!';
      btn.innerText = '✔ Yükleme Tamamlandı';
      selectedFiles = [];
      document.getElementById('fileInput').value = '';

      setTimeout(() => {
        btn.disabled = true;
        btn.innerText = '🚀 Seçilenleri Televizyona Gönder';
        pBar.style.display = 'none';
        pFill.style.width = '0%';
        loadPhotos();
      }, 1500);
    }

    async function loadPhotos() {
      try {
        const res = await fetch('/api/photos');
        const list = await res.json();
        const grid = document.getElementById('galleryGrid');
        const count = document.getElementById('photoCount');
        count.innerText = list.length;

        if (list.length === 0) {
          grid.innerHTML = '<div class="empty-gallery">Henüz televizyona yüklenmiş fotoğraf yok.</div>';
          return;
        }

        grid.innerHTML = list.map(function(item) {
          return '<div class="gallery-item">' +
                 '<img src="/photo?name=' + encodeURIComponent(item.name) + '" loading="lazy">' +
                 '<button class="del-btn" onclick="deletePhoto(\'' + encodeURIComponent(item.name) + '\')">✕</button>' +
                 '</div>';
        }).join('');
      } catch (e) {
        document.getElementById('galleryGrid').innerHTML = '<div class="empty-gallery">Bağlantı hatası.</div>';
      }
    }

    async function deletePhoto(name) {
      if (!confirm('Bu fotoğraf televizyondan silinsin mi?')) return;
      try {
        await fetch('/api/delete?name=' + name, { method: 'POST' });
        loadPhotos();
      } catch (e) {
        alert('Silme işlemi başarısız.');
      }
    }

    async function clearAllPhotos() {
      if (!confirm('Televizyondaki TÜM fotoğraflar silinsin mi?')) return;
      try {
        await fetch('/api/clear', { method: 'POST' });
        loadPhotos();
      } catch (e) {
        alert('Silme işlemi başarısız.');
      }
    }

    loadPhotos();
  </script>
</body>
</html>
        """.trimIndent()

        val bytes = html.toByteArray(Charsets.UTF_8)
        val header = "HTTP/1.1 200 OK\r\n" +
                "Content-Type: text/html; charset=utf-8\r\n" +
                "Content-Length: ${bytes.size}\r\n" +
                "Connection: close\r\n\r\n"
        output.write(header.toByteArray(Charsets.UTF_8))
        output.write(bytes)
        output.flush()
    }

    private fun servePhotosJson(output: OutputStream) {
        val files = photosDir.listFiles { f ->
            val ext = f.extension.lowercase()
            f.isFile && (ext == "jpg" || ext == "jpeg" || ext == "png" || ext == "webp")
        }?.sortedByDescending { it.lastModified() } ?: emptyList()

        val jsonArray = JSONArray()
        for (f in files) {
            val obj = JSONObject().apply {
                put("name", f.name)
                put("size", f.length())
                put("path", f.absolutePath)
            }
            jsonArray.put(obj)
        }

        val bytes = jsonArray.toString().toByteArray(Charsets.UTF_8)
        val header = "HTTP/1.1 200 OK\r\n" +
                "Content-Type: application/json; charset=utf-8\r\n" +
                "Content-Length: ${bytes.size}\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Connection: close\r\n\r\n"
        output.write(header.toByteArray(Charsets.UTF_8))
        output.write(bytes)
        output.flush()
    }

    private fun servePhotoFile(query: String, output: OutputStream) {
        val params = parseQuery(query)
        val name = params["name"]
        if (name.isNullOrEmpty()) {
            sendResponse(output, 400, "Bad Request", "Fotoğraf adı eksik.")
            return
        }

        val file = File(photosDir, File(name).name)
        if (!file.exists() || !file.isFile) {
            sendResponse(output, 404, "Not Found", "Fotoğraf bulunamadı.")
            return
        }

        val mime = when (file.extension.lowercase()) {
            "png" -> "image/png"
            "webp" -> "image/webp"
            else -> "image/jpeg"
        }

        val length = file.length()
        val header = "HTTP/1.1 200 OK\r\n" +
                "Content-Type: $mime\r\n" +
                "Content-Length: $length\r\n" +
                "Cache-Control: public, max-age=86400\r\n" +
                "Connection: close\r\n\r\n"
        output.write(header.toByteArray(Charsets.UTF_8))

        FileInputStream(file).use { input ->
            val buf = ByteArray(16384)
            var r: Int
            while (input.read(buf).also { r = it } != -1) {
                output.write(buf, 0, r)
            }
        }
        output.flush()
    }

    private fun handleUpload(reader: BufferedReader, length: Int, output: OutputStream) {
        try {
            val charBuffer = CharArray(length)
            var totalRead = 0
            while (totalRead < length) {
                val r = reader.read(charBuffer, totalRead, length - totalRead)
                if (r == -1) break
                totalRead += r
            }

            val body = String(charBuffer, 0, totalRead)
            val json = JSONObject(body)
            val name = json.optString("name", "photo_${System.currentTimeMillis()}.jpg")
            val rawData = json.getString("data")

            val base64Index = rawData.indexOf(",")
            val cleanBase64 = if (base64Index != -1) rawData.substring(base64Index + 1) else rawData
            val imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT)

            val safeName = "photo_${System.currentTimeMillis()}_${File(name).name.replace(Regex("[^a-zA-Z0-9._-]"), "_")}"
            val destFile = File(photosDir, safeName)

            FileOutputStream(destFile).use { it.write(imageBytes) }

            onPhotosChanged()

            val resp = JSONObject().apply {
                put("status", "ok")
                put("file", safeName)
            }.toString().toByteArray(Charsets.UTF_8)

            val header = "HTTP/1.1 200 OK\r\n" +
                    "Content-Type: application/json; charset=utf-8\r\n" +
                    "Content-Length: ${resp.size}\r\n" +
                    "Access-Control-Allow-Origin: *\r\n" +
                    "Connection: close\r\n\r\n"
            output.write(header.toByteArray(Charsets.UTF_8))
            output.write(resp)
            output.flush()
        } catch (e: Exception) {
            sendResponse(output, 500, "Error", e.message ?: "Yükleme hatası")
        }
    }

    private fun handleDelete(query: String, output: OutputStream) {
        val params = parseQuery(query)
        val name = params["name"]
        if (!name.isNullOrEmpty()) {
            val file = File(photosDir, File(name).name)
            if (file.exists()) {
                file.delete()
            }
        }
        onPhotosChanged()
        val resp = """{"status":"deleted"}""".toByteArray(Charsets.UTF_8)
        val header = "HTTP/1.1 200 OK\r\n" +
                "Content-Type: application/json\r\n" +
                "Content-Length: ${resp.size}\r\n" +
                "Connection: close\r\n\r\n"
        output.write(header.toByteArray(Charsets.UTF_8))
        output.write(resp)
        output.flush()
    }

    private fun handleClear(output: OutputStream) {
        photosDir.listFiles()?.forEach { it.delete() }
        onPhotosChanged()
        val resp = """{"status":"cleared"}""".toByteArray(Charsets.UTF_8)
        val header = "HTTP/1.1 200 OK\r\n" +
                "Content-Type: application/json\r\n" +
                "Content-Length: ${resp.size}\r\n" +
                "Connection: close\r\n\r\n"
        output.write(header.toByteArray(Charsets.UTF_8))
        output.write(resp)
        output.flush()
    }

    private fun sendResponse(output: OutputStream, code: Int, status: String, message: String) {
        val body = message.toByteArray(Charsets.UTF_8)
        val header = "HTTP/1.1 $code $status\r\n" +
                "Content-Type: text/plain; charset=utf-8\r\n" +
                "Content-Length: ${body.size}\r\n" +
                "Connection: close\r\n\r\n"
        output.write(header.toByteArray(Charsets.UTF_8))
        output.write(body)
        output.flush()
    }

    private fun parseQuery(query: String): Map<String, String> {
        val map = mutableMapOf<String, String>()
        if (query.isEmpty()) return map
        val pairs = query.split("&")
        for (p in pairs) {
            val idx = p.indexOf("=")
            if (idx > 0) {
                val key = URLDecoder.decode(p.substring(0, idx), "UTF-8")
                val value = URLDecoder.decode(p.substring(idx + 1), "UTF-8")
                map[key] = value
            }
        }
        return map
    }
}
