package expo.modules.whatsappbridge

import android.app.Notification
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

internal fun bridgeEventKey(sentAt: String, sender: String, body: String, occurrence: Int): String =
  MessageDigest.getInstance("SHA-256").digest("$sentAt\u0000$sender\u0000$body\u0000$occurrence".toByteArray(Charsets.UTF_8))
    .joinToString("") { "%02x".format(it) }

class WhatsAppNotificationListener : NotificationListenerService() {
  companion object { @Volatile var connected = false }

  override fun onListenerConnected() {
    connected = true
    if (BridgeStorage.read(this).optString("token").isNotEmpty()) BridgeUpload.start(this)
  }

  override fun onListenerDisconnected() { connected = false }

  override fun onNotificationPosted(notification: StatusBarNotification) {
    // Keep all other apps, private conversations and summary notifications on the device.
    if (notification.packageName != "com.whatsapp" || Build.VERSION.SDK_INT < 28 ||
      notification.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
    val style = NotificationCompat.MessagingStyle.extractMessagingStyleFromNotification(notification.notification) ?: return
    if (!style.isGroupConversation) return
    val conversation = bridgeConversation(notification.packageName, style.isGroupConversation,
      notification.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0,
      notification.notification.shortcutId, notification.user.hashCode()) ?: return
    val name = style.conversationTitle?.toString()?.take(120) ?: "WhatsApp গ্রুপ"
    try {
      val initial = BridgeStorage.read(this)
      if (initial.optString("token").isEmpty() && initial.optJSONObject("pairing") == null) return
      var upload = false
      BridgeStorage.change(this) { state ->
        val pairing = state.optJSONObject("pairing")
        if (pairing != null && System.currentTimeMillis() - pairing.getLong("started") < 10 * 60_000) {
          val code = pairing.getString("code")
          val sample = style.messages.firstOrNull { it.timestamp >= pairing.getLong("started") && it.text?.toString()?.trim() == code }
          if (sample != null && pairing.optString("conversation").isEmpty()) pairing.put("conversation", conversation).put("name", name)
          return@change
        }
        if (state.optString("token").isEmpty() || state.optString("conversation") != conversation) return@change
        val seen = state.optJSONArray("seen") ?: JSONArray()
        val known = (0 until seen.length()).map { seen.getString(it) }.toMutableSet()
        val queue = BridgeStorage.items(state, "queue").toMutableList()
        val occurrences = mutableMapOf<String, Int>()
        val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
        for (message in style.messages) {
          val body = message.text?.toString()?.takeIf { it.isNotBlank() && it.length <= 4000 && !it.contains('\u0000') } ?: continue
          val person = message.person?.name?.toString()?.trim()?.take(160) ?: continue
          if (person.isBlank() || person.contains('\u0000') || message.timestamp < state.optLong("started") || message.timestamp > System.currentTimeMillis() + 300_000) continue
          val sender = if (person.matches(Regex("^\\+?[\\d\\s()-]{7,}$"))) "WhatsApp সদস্য" else person
          val sent = format.format(Date(message.timestamp))
          val identity = "$sent\u0000$sender\u0000$body"
          val occurrence = occurrences.getOrDefault(identity, 0)
          occurrences[identity] = occurrence + 1
          val eventKey = bridgeEventKey(sent, sender, body, occurrence)
          if (!known.add(eventKey)) continue
          queue.add(JSONObject().put("event_key", eventKey).put("sender", sender).put("body", body).put("sent_at", sent))
          seen.put(eventKey)
          upload = true
        }
        state.put("queue", JSONArray(queue.takeLast(200)))
        state.put("seen", JSONArray((maxOf(0, seen.length() - 1000) until seen.length()).map { seen.getString(it) }))
        if (queue.size > 200) state.put("dropped", state.optInt("dropped") + queue.size - 200)
      }
      if (upload) BridgeUpload.schedule(this)
    } catch (_: Exception) {
      // Malformed or unavailable notification content must not crash the listener.
    }
  }
}
