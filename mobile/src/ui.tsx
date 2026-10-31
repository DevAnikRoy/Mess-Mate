import { type ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./theme";

export { usePullReload } from "./refresh";

export const ripple = { color: "rgba(108,77,255,0.16)" };

export function Page({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.page, style]}>{children}</View>;
}

export function Screen({
  children,
  padded = true,
  onRefresh,
  refreshing = false,
  canvas = colors.paper,
}: {
  children: ReactNode;
  padded?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  canvas?: string;
}) {
  return (
    <KeyboardAvoidingView style={[styles.page, { backgroundColor: canvas }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.purple]} /> : undefined
        }
        contentContainerStyle={[styles.screenBody, padded && styles.padded]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Group({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.group}>{children}</View>
    </View>
  );
}

export function Row({
  title,
  subtitle,
  onPress,
  leading,
  trailing,
  last,
  danger,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  last?: boolean;
  danger?: boolean;
}) {
  const inner = (
    <>
      {leading ? <View style={styles.rowLead}>{leading}</View> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, danger && { color: colors.bad }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
    </>
  );
  if (!onPress) {
    return <View style={[styles.row, !last && styles.rowLine]}>{inner}</View>;
  }
  return (
    <Pressable onPress={onPress} android_ripple={ripple} style={[styles.row, !last && styles.rowLine]}>
      {inner}
    </Pressable>
  );
}

export function Money({
  amount,
  label,
  tone = "neutral",
}: {
  amount: string;
  label?: string;
  tone?: "good" | "bad" | "neutral" | "purple";
}) {
  const color = tone === "good" ? colors.good : tone === "bad" ? colors.bad : tone === "purple" ? colors.purple : colors.ink;
  return (
    <View>
      {label ? <Text style={styles.kicker}>{label}</Text> : null}
      <Text style={[styles.money, { color }]}>{amount}</Text>
    </View>
  );
}

export function FAB({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} android_ripple={ripple} style={styles.fab}>
      <Ionicons name="add" size={28} color="#fff" />
    </Pressable>
  );
}

export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetWrap}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={12} android_ripple={ripple} style={styles.iconBtn}>
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function SwitchRow({
  label,
  hint,
  value,
  onValueChange,
  disabled,
  last,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowLine, disabled && { opacity: 0.45 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{label}</Text>
        {hint ? <Text style={styles.rowSub}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#E4DFEE", true: "#C9BBFF" }}
        thumbColor={value ? colors.purple : "#f4f3f4"}
      />
    </View>
  );
}

export function Card({ children, tint, style }: { children: ReactNode; tint?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, tint ? { backgroundColor: tint, borderWidth: 0 } : null, style]}>{children}</View>;
}

export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function Field(props: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secure?: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "decimal-pad" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  maxLength?: number;
}) {
  return (
    <TextInput
      value={props.value}
      onChangeText={props.onChangeText}
      placeholder={props.placeholder}
      placeholderTextColor={colors.muted}
      secureTextEntry={props.secure}
      multiline={props.multiline}
      keyboardType={props.keyboardType}
      autoCapitalize={props.autoCapitalize ?? "none"}
      autoCorrect={false}
      maxLength={props.maxLength}
      style={[styles.field, props.multiline ? styles.area : null]}
    />
  );
}

export function Button({
  label,
  onPress,
  kind = "primary",
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "dark" | "ghost" | "danger" | "mint";
  disabled?: boolean;
  busy?: boolean;
}) {
  const bg =
    kind === "dark" ? colors.dark : kind === "mint" ? "#128A4A" : kind === "ghost" ? colors.field : kind === "danger" ? "#FFE4EA" : colors.purple;
  const color = kind === "ghost" ? colors.ink : kind === "danger" ? colors.bad : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      android_ripple={ripple}
      style={[styles.btn, { backgroundColor: bg, opacity: disabled || busy ? 0.5 : 1 }]}
    >
      {busy ? <ActivityIndicator color={color} /> : <Text style={[styles.btnText, { color }]}>{label}</Text>}
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} android_ripple={ripple} style={[styles.chip, active && styles.chipOn]}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function Avatar({ name, src, size = 44 }: { name: string; src: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const letter = [...name.trim()][0] || "?";
  if (!src || failed) {
    return (
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.avatarLetter, { fontSize: size * 0.38 }]}>{letter}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: src }}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.soft }}
    />
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Text style={styles.err}>{children}</Text>;
}

export function Title({ kicker, children }: { kicker?: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text style={styles.h1}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  screenBody: { paddingBottom: 40 },
  padded: { padding: 16 },
  groupTitle: { color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 8, marginLeft: 4 },
  group: {
    backgroundColor: colors.paper,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.paper },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowLead: { width: 40, alignItems: "center" },
  rowTitle: { color: colors.ink, fontSize: 16, fontWeight: "600" },
  rowSub: { color: colors.muted, fontSize: 12, marginTop: 2, lineHeight: 18 },
  kicker: { color: colors.muted, fontSize: 12, marginBottom: 2 },
  h1: { color: colors.ink, fontSize: 26, fontWeight: "700" },
  money: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  panel: {
    backgroundColor: colors.paper,
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  field: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.field,
    paddingHorizontal: 16,
    color: colors.ink,
    fontSize: 16,
  },
  area: { minHeight: 140, paddingTop: 14, textAlignVertical: "top" },
  btn: { minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  btnText: { fontWeight: "700", fontSize: 16 },
  chip: { backgroundColor: colors.field, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.purple },
  chipText: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  chipTextOn: { color: "#fff" },
  avatar: { backgroundColor: colors.purple, alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#fff", fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  err: { color: colors.bad, fontSize: 13, marginTop: 8 },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  sheetWrap: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(27,23,48,0.45)" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
    maxHeight: "88%",
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#D9D3E8", marginBottom: 12 },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.ink },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  empty: { paddingVertical: 36, paddingHorizontal: 24, alignItems: "center" },
  emptyText: { color: colors.muted, textAlign: "center", lineHeight: 22 },
});
