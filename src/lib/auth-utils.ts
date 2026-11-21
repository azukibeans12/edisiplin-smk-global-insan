export const INTERNAL_AUTH_DOMAIN = "globalinsan.sch.id";

/**
 * Turns any admin-chosen username (e.g. "avandi", "pak.budi", "admin")
 * into a valid Supabase Auth email without requiring a real inbox.
 * If the input already contains '@', it is kept as-is.
 */
export function toAuthEmail(usernameOrEmail: string): string {
  const cleaned = usernameOrEmail.trim().toLowerCase();
  if (!cleaned) return "";
  if (cleaned.includes("@")) return cleaned;
  const safeUser = cleaned.replace(/[^a-z0-9._-]/g, "");
  return `${safeUser}@${INTERNAL_AUTH_DOMAIN}`;
}

export function normalizeUsername(input: string): string {
  const cleaned = input.trim().toLowerCase();
  if (cleaned.includes("@")) {
    return cleaned.split("@")[0].replace(/[^a-z0-9._-]/g, "");
  }
  return cleaned.replace(/[^a-z0-9._-]/g, "");
}
