import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeUsername, toAuthEmail } from "@/lib/auth-utils";

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY belum diatur di .env.local / Vercel. Tambahkan SUPABASE_SERVICE_ROLE_KEY agar Admin dapat membuat akun Guru langsung dari aplikasi.",
      },
      { status: 501 }
    );
  }

  try {
    const body = await req.json();
    const { full_name, username, password, role, phone_wa, avatar_url } = body as {
      full_name?: string;
      username?: string;
      password?: string;
      role?: "admin" | "guru";
      phone_wa?: string | null;
      avatar_url?: string | null;
    };

    const cleanUsername = normalizeUsername(username || "");
    const authEmail = toAuthEmail(username || "");

    if (!full_name || !cleanUsername || !authEmail || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Nama lengkap, username (huruf/angka), dan kata sandi (min. 6 karakter) wajib diisi." },
        { status: 400 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
    });

    if (authErr || !authData.user) {
      return NextResponse.json({ error: authErr?.message || "Gagal membuat akun login." }, { status: 400 });
    }

    const { error: profErr } = await adminClient.from("staff_profiles").insert({
      id: authData.user.id,
      username: cleanUsername,
      full_name: full_name.trim(),
      email: authEmail,
      role: role === "admin" ? "admin" : "guru",
      phone_wa: phone_wa?.trim() || null,
      avatar_url: avatar_url || null,
      is_active: true,
    });

    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: authData.user.id, username: cleanUsername });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY belum diatur. Hapus akun lewat Supabase Dashboard atau tambahkan SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 501 }
    );
  }

  try {
    const body = await req.json();
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "ID guru tidak valid." }, { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Deletes from auth.users which cascades to staff_profiles (point_records keep reported_by_name)
    const { error } = await adminClient.auth.admin.deleteUser(id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}
