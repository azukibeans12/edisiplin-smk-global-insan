import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeUsername, toAuthEmail } from "@/lib/auth-utils";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function verifyAdminRequest(req: Request, adminClient: NonNullable<ReturnType<typeof getAdminClient>>) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return { ok: false, error: "Sesi login tidak ditemukan. Silakan login ulang." };

  const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
  if (userErr || !userData.user) return { ok: false, error: "Sesi tidak valid. Silakan login ulang." };

  const { data: prof } = await adminClient
    .from("staff_profiles")
    .select("role, is_active")
    .eq("id", userData.user.id)
    .single();

  if (!prof || prof.role !== "admin" || !prof.is_active) {
    return { ok: false, error: "Akses ditolak: khusus Admin / Guru BK." };
  }
  return { ok: true, callerId: userData.user.id };
}

export async function POST(req: Request) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY belum diatur di .env.local / Vercel. Tambahkan SUPABASE_SERVICE_ROLE_KEY agar Admin dapat mengelola akun Guru langsung dari aplikasi.",
      },
      { status: 501 }
    );
  }

  const check = await verifyAdminRequest(req, adminClient);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

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

export async function PATCH(req: Request) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY belum diatur di .env.local / Vercel. Tambahkan SUPABASE_SERVICE_ROLE_KEY untuk mereset kata sandi guru langsung dari aplikasi.",
      },
      { status: 501 }
    );
  }

  const check = await verifyAdminRequest(req, adminClient);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

  try {
    const body = await req.json();
    const { id, newPassword } = body as { id?: string; newPassword?: string };

    if (!id || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Kata sandi baru wajib diisi (minimal 6 karakter)." },
        { status: 400 }
      );
    }

    const { error } = await adminClient.auth.admin.updateUserById(id, {
      password: newPassword,
    });

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

export async function DELETE(req: Request) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY belum diatur. Hapus akun lewat Supabase Dashboard atau tambahkan SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 501 }
    );
  }

  const check = await verifyAdminRequest(req, adminClient);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

  try {
    const body = await req.json();
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "ID guru tidak valid." }, { status: 400 });
    }
    if (id === check.callerId) {
      return NextResponse.json({ error: "Tidak dapat menghapus akun Anda sendiri." }, { status: 400 });
    }

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
