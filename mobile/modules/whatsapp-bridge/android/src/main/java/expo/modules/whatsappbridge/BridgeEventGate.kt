package expo.modules.whatsappbridge

/** Keep conversation selection independent of display names and notification grouping. */
internal fun bridgeConversation(packageName: String, group: Boolean, summary: Boolean, shortcut: String?, user: Int): String? {
  if (packageName != "com.whatsapp" || !group || summary || shortcut.isNullOrBlank()) return null
  return "$user:$shortcut"
}
