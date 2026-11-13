package expo.modules.whatsappbridge

import android.content.Context
import androidx.work.*
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

internal object BridgeUpload {
  private val executor = Executors.newSingleThreadExecutor()
  private const val UPLOAD = "messmate-whatsapp-upload"
  private const val HEARTBEAT = "messmate-whatsapp-heartbeat"

  fun schedule(context: Context) {
    val app = context.applicationContext
    WorkManager.getInstance(app).enqueueUniqueWork(UPLOAD, ExistingWorkPolicy.APPEND_OR_REPLACE,
      OneTimeWorkRequestBuilder<BridgeUploadWorker>()
        .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
        .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS).build())
    // Try immediately while the notification listener is alive. WorkManager recovers interruptions.
    executor.execute { flush(app) }
  }

  fun start(context: Context) {
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(HEARTBEAT, ExistingPeriodicWorkPolicy.KEEP,
      PeriodicWorkRequestBuilder<BridgeUploadWorker>(15, TimeUnit.MINUTES)
        .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build())
    schedule(context)
  }

  fun stop(context: Context) {
    BridgeStorage.clear(context)
    WorkManager.getInstance(context).cancelUniqueWork(UPLOAD)
    WorkManager.getInstance(context).cancelUniqueWork(HEARTBEAT)
  }

  @Synchronized fun flush(context: Context): Boolean {
    try {
      repeat(8) {
        val state = BridgeStorage.read(context)
        val token = state.optString("token")
        if (token.isEmpty()) return true
        val queued = BridgeStorage.items(state, "queue")
        if (queued.isEmpty() && System.currentTimeMillis() - state.optLong("lastSynced") < 60_000) return true
        val batch = queued.take(25)
        val target = URI(state.getString("url").trimEnd('/') + "/rest/v1/rpc/ingest_whatsapp_messages")
        if (target.scheme != "https" || target.host == null || target.userInfo != null) return false
        val connection = target.toURL().openConnection() as HttpURLConnection
        val status: Int
        val body: String
        try {
          connection.requestMethod = "POST"
          connection.connectTimeout = 8_000
          connection.readTimeout = 15_000
          connection.instanceFollowRedirects = false
          connection.doOutput = true
          connection.setRequestProperty("Content-Type", "application/json")
          connection.setRequestProperty("apikey", state.getString("key"))
          val payload = JSONObject().put("p_token", token).put("p_events", JSONArray(batch))
          connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
          status = connection.responseCode
          val response = if (status in 200..299) connection.inputStream else connection.errorStream
          body = response?.use { it.reader().readText().take(2048) } ?: ""
        } finally {
          connection.disconnect()
        }
        if (status !in 200..299) {
          if (body.contains("bridge_revoked")) {
            // Re-pairing on another device must never be undone by an old worker.
            BridgeStorage.change(context) { current ->
              if (current.optString("token") == token) {
                current.remove("token")
                current.put("queue", JSONArray()).put("error", "revoked")
              }
            }
            return true
          }
          if (body.contains("feed_paused")) {
            BridgeStorage.change(context) { current ->
              if (current.optString("token") == token) current.put("queue", JSONArray()).put("error", "paused")
            }
            return true
          }
          BridgeStorage.change(context) { current ->
            if (current.optString("token") == token) current.put("error", if (body.contains("invalid_messages")) "invalid" else "network")
          }
          return false
        }
        val delivered = batch.map { it.getString("event_key") }.toSet()
        BridgeStorage.change(context) { current ->
          if (current.optString("token") == token) {
            current.put("queue", JSONArray(BridgeStorage.items(current, "queue").filterNot { delivered.contains(it.getString("event_key")) }))
            current.put("lastSynced", System.currentTimeMillis()).remove("error")
          }
        }
        if (batch.isEmpty()) return true
      }
      return BridgeStorage.items(BridgeStorage.read(context), "queue").isEmpty()
    } catch (_: Exception) {
      // Never log credentials or notification contents, including on transport errors.
      return false
    }
  }
}

class BridgeUploadWorker(context: Context, parameters: WorkerParameters) : Worker(context, parameters) {
  override fun doWork(): Result = if (BridgeUpload.flush(applicationContext)) Result.success() else Result.retry()
}
