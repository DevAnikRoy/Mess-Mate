package expo.modules.whatsappbridge

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Credentials and the bounded upload queue stay encrypted, outside Android backups. */
internal object BridgeStorage {
  private const val KEY = "messmate_whatsapp_bridge_v1"

  private fun key(): SecretKey {
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (store.getKey(KEY, null) as? SecretKey)?.let { return it }
    return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
      init(KeyGenParameterSpec.Builder(KEY, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
    }.generateKey()
  }

  private fun file(context: Context) = AtomicFile(File(context.noBackupFilesDir, "whatsapp-bridge.enc"))

  @Synchronized fun read(context: Context): JSONObject {
    if (!file(context).baseFile.exists()) return JSONObject()
    return try {
      val envelope = JSONObject(file(context).openRead().use { it.reader().readText() })
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(envelope.getString("iv"), Base64.NO_WRAP)))
      JSONObject(String(cipher.doFinal(Base64.decode(envelope.getString("data"), Base64.NO_WRAP)), Charsets.UTF_8))
    } catch (_: Exception) {
      // A lost/restored keystore requires explicit pairing again.
      JSONObject()
    }
  }

  @Synchronized fun change(context: Context, update: (JSONObject) -> Unit) {
    val state = read(context)
    update(state)
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, key())
    val envelope = JSONObject()
      .put("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
      .put("data", Base64.encodeToString(cipher.doFinal(state.toString().toByteArray(Charsets.UTF_8)), Base64.NO_WRAP))
    val target = file(context)
    val stream = target.startWrite()
    try {
      stream.write(envelope.toString().toByteArray(Charsets.UTF_8))
      target.finishWrite(stream)
    } catch (error: Exception) {
      target.failWrite(stream)
      throw error
    }
  }

  @Synchronized fun clear(context: Context) { file(context).delete() }

  fun items(state: JSONObject, name: String): List<JSONObject> {
    val array = state.optJSONArray(name) ?: JSONArray()
    return (0 until array.length()).map { array.getJSONObject(it) }
  }
}
