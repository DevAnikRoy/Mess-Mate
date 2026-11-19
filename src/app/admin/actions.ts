"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/admin";

export async function manageAdminMember(formData: FormData) {
  const messId = String(formData.get("messId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(messId) || !/^[0-9a-f-]{36}$/i.test(userId)) return;
  if (action !== "suspend" && action !== "restore" && action !== "transfer_manager") return;

  const supabase = await requirePlatformAdmin();
  const { error } = await supabase.rpc("platform_admin_manage_member", {
    p_mess: messId,
    p_user: userId,
    p_action: action,
  });
  if (error) throw new Error("This admin action could not be completed.");
  revalidatePath(`/admin/messes/${messId}`);
  revalidatePath("/admin");
}
