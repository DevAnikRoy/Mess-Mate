import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export type NativeBridgeStatus = {
  permission: boolean;
  supported: boolean;
  listening: boolean;
  active: boolean;
  deviceId: string;
  messId: string;
  ownerId: string;
  pending: boolean;
  pairCode: string;
  candidate: string;
  queued: number;
  dropped: number;
  lastSynced: number;
  error: string;
};

type BridgeModule = {
  getStatus(): Promise<NativeBridgeStatus>;
  openSettings(): Promise<void>;
  beginPairing(code: string): Promise<void>;
  activate(
    url: string,
    key: string,
    token: string,
    deviceId: string,
    messId: string,
    ownerId: string,
  ): Promise<void>;
  disconnect(): Promise<void>;
  syncNow(): Promise<void>;
};

export const whatsappBridge =
  Platform.OS === "android" ? requireOptionalNativeModule<BridgeModule>("WhatsAppBridge") : null;
