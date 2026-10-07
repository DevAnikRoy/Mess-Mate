import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const NEXT_COOKIE = "mm_next";

function isPublic(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/auth/");
}

function redirectKeepingCookies(request: NextRequest, target: string, current: NextResponse) {
  const url = new URL(target, request.nextUrl.origin);
  const redirect = NextResponse.redirect(url);
  current.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const path = request.nextUrl.pathname;
  const code = request.nextUrl.searchParams.get("code");
  if (path === "/" && code) {
    return redirectKeepingCookies(request, `/auth/callback?code=${encodeURIComponent(code)}`, response);
  }

  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    return isPublic(path) ? response : redirectKeepingCookies(request, "/login", response);
  }

  if (!user) {
    if (isPublic(path)) return response;
    const redirect = redirectKeepingCookies(request, "/login", response);
    if (path.startsWith("/join/")) {
      redirect.cookies.set(NEXT_COOKIE, path, { path: "/", maxAge: 60 * 30, sameSite: "lax", httpOnly: true });
    }
    return redirect;
  }

  if (path === "/login") return redirectKeepingCookies(request, "/", response);
  if (path.startsWith("/auth/") || path.startsWith("/api/")) return response;

  const { data: membership } = await supabase
    .from("memberships")
    .select("mess_id")
    .eq("user_id", user.id)
    .is("left_on", null)
    .maybeSingle();

  const inMess = Boolean(membership);
  const pending = request.cookies.get(NEXT_COOKIE)?.value;
  if (pending) {
    const target = !inMess && /^\/join\/[A-Za-z0-9]{4,16}$/.test(pending) && path !== pending ? pending : null;
    const next = target ? redirectKeepingCookies(request, target, response) : response;
    next.cookies.delete(NEXT_COOKIE);
    if (target) return next;
  }

  const setup = path === "/onboarding" || path.startsWith("/join/");
  if (!inMess && !setup && path !== "/account") return redirectKeepingCookies(request, "/onboarding", response);
  if (inMess && setup) return redirectKeepingCookies(request, "/", response);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
