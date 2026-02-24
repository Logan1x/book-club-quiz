export function requireAdmin(req: Request) {
  const key = process.env.ADMIN_KEY;
  if (!key) return; // no auth configured

  const url = new URL(req.url);
  const provided = url.searchParams.get("key") || req.headers.get("x-admin-key") || "";
  if (provided !== key) {
    throw new Error("UNAUTHORIZED");
  }
}
