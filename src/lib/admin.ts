import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ownerEmail = "softvenceanik@gmail.com";

export type AdminOverview = {
  total_messes: number;
  active_messes: number;
  active_members: number;
  managers: number;
  new_messes_30d: number;
};

export type AdminMess = {
  id: string;
  name: string;
  created_at: string;
  manager_name: string;
  active_members: number;
  total_members: number;
};

export type AdminMember = {
  mess_id: string;
  mess_name: string;
  user_id: string;
  full_name: string;
  email: string | null;
  role: "manager" | "member";
  joined_on: string;
  left_on: string | null;
  created_at: string;
};

export async function requirePlatformAdmin() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const { data } = await supabase.auth.getUser();
  if (!data.user || data.user.email?.trim().toLowerCase() !== ownerEmail) redirect("/");
  return supabase;
}

export async function getAdminOverview() {
  const supabase = await requirePlatformAdmin();
  const { data, error } = await supabase.rpc("platform_admin_overview");
  if (error) throw new Error("Admin overview could not be loaded.");
  return (data?.[0] ?? null) as AdminOverview | null;
}

export async function getAdminMesses(query = "") {
  const supabase = await requirePlatformAdmin();
  const { data, error } = await supabase.rpc("platform_admin_messes", { p_query: query, p_limit: 100 });
  if (error) throw new Error("Mess directory could not be loaded.");
  return (data ?? []) as AdminMess[];
}

export async function getAdminMessMembers(messId: string) {
  const supabase = await requirePlatformAdmin();
  const { data, error } = await supabase.rpc("platform_admin_mess_members", { p_mess: messId });
  if (error) throw new Error("Mess members could not be loaded.");
  return (data ?? []) as AdminMember[];
}
