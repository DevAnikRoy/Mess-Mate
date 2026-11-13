package expo.modules.whatsappbridge

import org.junit.Assert.*
import org.junit.Test

class BridgeEventGateTest {
  @Test fun unrelatedNotificationsAndPrivateChatsAreRejected() {
    assertNull(bridgeConversation("com.other.app", true, false, "group", 0))
    assertNull(bridgeConversation("com.whatsapp", false, false, "private", 0))
    assertNull(bridgeConversation("com.whatsapp", true, true, "summary", 0))
    assertNull(bridgeConversation("com.whatsapp", true, false, null, 0))
    assertNull(bridgeConversation("com.whatsapp", true, false, " ", 0))
  }

  @Test fun identitySeparatesGroupsAndAndroidProfiles() {
    val selected = bridgeConversation("com.whatsapp", true, false, "group-a", 0)
    assertEquals("0:group-a", selected)
    assertNotEquals(selected, bridgeConversation("com.whatsapp", true, false, "group-b", 0))
    assertNotEquals(selected, bridgeConversation("com.whatsapp", true, false, "group-a", 10))
  }

  @Test fun eventIdentityMatchesWebImportsAndDistinguishesRepeatedMessages() {
    val sent = "2026-11-12T04:15:00.000Z"
    assertEquals("55b0994edb366c86f04f91d0d1c5a4e6ceacf2afaf0e9692ba367ad990380444", bridgeEventKey(sent, "QA", "same", 0))
    assertNotEquals(bridgeEventKey(sent, "QA", "same", 0), bridgeEventKey(sent, "QA", "same", 1))
  }
}
