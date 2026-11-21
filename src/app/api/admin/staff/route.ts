import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY belum diatur di .env.local / Vercel. Buat user baru melalui Supabase Dashboard -> Authentication -> Users, atau tambahkan SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 501 }
    );
  }

  try {
    const body = await req.json();
    const { full_name, email, password, role, phone_wa, avatar_url } = body as {
      full_name?: string;
      email?: string;
      password?: string;
      role?: "admin" | "guru";
      phone_wa?: string | null;
      avatar_url?: string | null;
    };

    if (!full_name || !email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Nama, email, dan kata sandi (min. 6 karakter) wajib diisi." },
        { status: 400 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });

    if (authErr || !authData.user) {
      return NextResponse.json({ error: authErr?.message || "Gagal membuat akun auth." }, { status: 400 });
    }

    const { error: profErr } = await adminClient.from("staff_profiles").insert({
      id: authData.user.id,
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      role: role === "admin" ? "admin" : "guru",
      phone_wa: phone_wa?.trim() || null,
      avatar_url: avatar_url || null,
      is_active: true,
    });

    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: authData.user.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}
