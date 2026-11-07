import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

const LOGIN_PATH = "/masuk";

// Semua halaman wajib login, kecuali halaman /masuk itu sendiri.
// Sekalian me-refresh sesi Supabase supaya cookie login tidak kedaluwarsa.
export async function proxy(request: NextRequest) {
  // Tanpa konfigurasi Supabase, aplikasi tetap bisa dipakai tanpa login.
  if (!SUPABASE_URL || !SUPABASE_KEY) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims memverifikasi token dengan kunci publik project (ES256), tanpa query database.
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;
  const onLoginPage = pathname === LOGIN_PATH;

  if (!loggedIn && !onLoginPage) {
    const url = new URL(LOGIN_PATH, request.url);
    url.searchParams.set("next", pathname + search);
    return redirectWithCookies(url, response);
  }
  if (loggedIn && onLoginPage) {
    return redirectWithCookies(new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url), response);
  }
  return response;
}

// Hanya izinkan kembali ke path di situs ini sendiri.
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith(LOGIN_PATH) ? next : "/";
}

// Cookie sesi yang baru di-refresh harus ikut terbawa saat redirect.
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // Lewati file statis, aset gambar, dan ping harian (dilindungi CRON_SECRET, bukan login).
  matcher: ["/((?!_next/static|_next/image|api/keep-alive|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
