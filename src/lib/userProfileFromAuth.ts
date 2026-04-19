/**
 * Derive first/last/display name from Supabase Auth user_metadata (and legacy `name`).
 */
export function namesFromAuthMetadata(
  meta: Record<string, unknown> | null | undefined,
  nameFromMeta: string,
  emailLocalFallback: string,
): { firstName: string; lastName: string; displayName: string } {
  const fn = typeof meta?.first_name === "string" ? meta.first_name.trim() : "";
  const ln = typeof meta?.last_name === "string" ? meta.last_name.trim() : "";
  if (fn && ln) {
    return { firstName: fn, lastName: ln, displayName: `${fn} ${ln}`.trim() };
  }
  const base = nameFromMeta.trim() || emailLocalFallback || "Member";
  const sp = base.indexOf(" ");
  if (sp > 0) {
    const f = base.slice(0, sp).trim();
    const l = base.slice(sp + 1).trim();
    return { firstName: f, lastName: l, displayName: `${f} ${l}`.trim() };
  }
  return { firstName: base, lastName: base, displayName: base };
}
