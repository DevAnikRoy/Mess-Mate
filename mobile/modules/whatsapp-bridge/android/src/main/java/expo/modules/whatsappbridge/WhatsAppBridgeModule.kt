package expo.modules.whatsappbridge

import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject
import java.net.URI

class WhatsAppBridgeModule : Module() {
  private val context: Context get() = requireNotNull(appContext.reactContext)
  private fun permitted(): Boolean = Build.VERSION.SDK_INT >= 28 &&
    context.getSystemService(NotificationManager::class.java).isNotificationListenerAccessGranted(ComponentName(context, WhatsAppNotificationListener::class.java))

  override fun definition() = ModuleDefinition {
    Name("WhatsAppBridge")

    AsyncFunction("getStatus") {
      val state = BridgeStorage.read(context)
      val pair = state.optJSONObject("pairing")
      val pending = pair != null && System.currentTimeMillis() - pair.optLong("started") < 600_000
      mapOf("permission" to permitted(), "supported" to (Build.VERSION.SDK_INT >= 28),
        "listening" to WhatsAppNotificationListener.connected,
        "deviceId" to state.optString("deviceId"), "messId" to state.optString("messId"),
        "ownerId" to state.optString("ownerId"), "active" to state.optString("token").isNotEmpty(),
        "pending" to pending, "pairCode" to if (pending) pair?.optString("code") else "",
        "candidate" to if (pending) pair?.optString("name") else "",
        "queued" to BridgeStorage.items(state, "queue").size, "dropped" to state.optInt("dropped"),
        "lastSynced" to state.optLong("lastSynced"), "error" to state.optString("error"))
    }

    AsyncFunction("openSettings") {
      context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    AsyncFunction("beginPairing") { code: String ->
      require(permitted()) { "notification_access_required" }
      require(code.matches(Regex("^MM-[A-F0-9]{12}$"))) { "invalid_pair_code" }
      BridgeUpload.stop(context)
      BridgeStorage.change(context) { it.put("pairing", JSONObject().put("code", code).put("started", System.currentTimeMillis())) }
      NotificationListenerServiceRebind.request(context)
    }

    AsyncFunction("activate") { url: String, key: String, token: String, deviceId: String, messId: String, ownerId: String ->
      require(permitted()) { "notification_access_required" }
      val target = URI(url)
      require(target.scheme == "https" && target.host != null && target.userInfo == null && target.rawQuery == null && target.rawFragment == null) { "invalid_url" }
      require(token.matches(Regex("^[a-f0-9]{64}$"))) { "invalid_token" }
      BridgeStorage.change(context) { state ->
        val pair = requireNotNull(state.optJSONObject("pairing")) { "pairing_expired" }
        require(System.currentTimeMillis() - pair.getLong("started") < 600_000 && pair.optString("conversation").isNotEmpty()) { "pairing_expired" }
        state.put("url", url).put("key", key).put("token", token).put("deviceId", deviceId)
          .put("messId", messId).put("ownerId", ownerId).put("conversation", pair.getString("conversation"))
          .put("started", System.currentTimeMillis()).remove("pairing")
      }
      BridgeUpload.start(context)
    }

    AsyncFunction("disconnect") { BridgeUpload.stop(context) }
    AsyncFunction("syncNow") { BridgeUpload.schedule(context) }
  }
}

private object NotificationListenerServiceRebind {
  fun request(context: Context) = android.service.notification.NotificationListenerService.requestRebind(ComponentName(context, WhatsAppNotificationListener::class.java))
}
