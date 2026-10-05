import { LoginForm } from "@/components/login-form";
import { supabaseEnv } from "@/lib/supabase/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return <LoginForm configured={Boolean(supabaseEnv())} callbackError={params.error === "callback"} />;
}
