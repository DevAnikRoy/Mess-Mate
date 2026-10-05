import md5 from "md5";
import type { User } from "@supabase/supabase-js";

export type SessionProfile = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  provider: "google" | "email";
};

function text(meta: Record<string, unknown> | undefined, key: string) {
  const value = meta?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function greetingName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function profileFromUser(user: User): SessionProfile {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const email = user.email?.trim() ?? "";
  const local = email.split("@")[0]?.replace(/[._+-]+/g, " ").trim();
  const name = text(meta, "full_name") || text(meta, "name") || local || "সদস্য";
  const picture = text(meta, "avatar_url") || text(meta, "picture");
  const provider = user.app_metadata?.provider === "google" ? "google" : "email";
  const avatarUrl =
    picture ||
    (email ? `https://www.gravatar.com/avatar/${md5(email.toLowerCase())}?d=404&s=256` : null);

  return { id: user.id, name, email, avatarUrl, provider };
}
