import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

// Dipanggil Vercel Cron sekali sehari (lihat vercel.json) supaya project Supabase gratis
// tidak di-pause karena tidak ada aktivitas selama 7 hari.
export async function GET(request: Request) {
  // Vercel otomatis mengirim header ini kalau env CRON_SECRET diisi.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return Response.json({ ok: false, error: "Supabase belum dikonfigurasi" }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { count, error } = await supabase.from("places").select("id", { count: "exact", head: true });
  if (error) {
    console.error("Keep-alive gagal:", error.message);
    return Response.json({ ok: false, error: error.message }, { status: 502 });
  }
  return Response.json({ ok: true, places: count, at: new Date().toISOString() });
}
