const ADMIN_KEY_STORAGE = "bcq.admin.key";

export function readAdminKey(): string {
  if (typeof window === "undefined") return "";

  try {
    const urlKey = new URLSearchParams(window.location.search).get("key") || "";
    const stored = localStorage.getItem(ADMIN_KEY_STORAGE) || "";
    const value = (urlKey || stored).trim();

    if (urlKey && urlKey !== stored) {
      localStorage.setItem(ADMIN_KEY_STORAGE, urlKey);
    }

    return value;
  } catch {
    return "";
  }
}

export function saveAdminKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    const clean = key.trim();
    if (!clean) {
      localStorage.removeItem(ADMIN_KEY_STORAGE);
      return;
    }
    localStorage.setItem(ADMIN_KEY_STORAGE, clean);
  } catch {
    // ignore
  }
}

export function adminHeaders(key: string): HeadersInit {
  return key.trim() ? { "x-admin-key": key.trim() } : {};
}
