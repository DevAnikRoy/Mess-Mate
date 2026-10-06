import { NextResponse } from "next/server";
import { profileFromUser } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const home = new URL("/", origin);

  if (!code) return NextResponse.redirect(new URL("/login?error=callback", origin));

  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(new URL("/login?error=callback", origin));

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=callback", origin));

  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const profile = profileFromUser(data.user);
    await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: profile.name,
      avatar_url: profile.provider === "google" ? profile.avatarUrl : null,
      email: profile.email,
      updated_at: new Date().toISOString(),
    });
  }

  return NextResponse.redirect(home);
}
