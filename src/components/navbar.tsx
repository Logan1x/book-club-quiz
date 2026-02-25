"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, Home, LogOut, Shield, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type UserIdentity = {
  name: string;
  whatsapp: string | null;
};

function lsGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function toLabel(segment: string) {
  if (segment === "q") return "Quiz";
  if (segment === "c") return "Cohort";
  return decodeURIComponent(segment)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const showBreadcrumbs = pathname !== "/";

  const adminKey = searchParams.get("key") || "";

  const breadcrumbs = useMemo(() => {
    const path = pathname || "/";
    const parts = path.split("/").filter(Boolean);
    const crumbs: Array<{ href: string; label: string }> = [{ href: "/", label: "Home" }];

    let built = "";
    for (const part of parts) {
      built += `/${part}`;
      const isAdminPath = built.startsWith("/admin");
      const href = isAdminPath && adminKey ? `${built}?key=${encodeURIComponent(adminKey)}` : built;
      crumbs.push({ href, label: toLabel(part) });
    }

    return crumbs;
  }, [pathname, adminKey]);

  useEffect(() => {
    const raw = lsGet("bcq.identity");
    if (!raw) return;
    try {
      const j = JSON.parse(raw);
      if (j?.name) setIdentity(j as UserIdentity);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const h = showBreadcrumbs ? "86px" : "52px";
    document.documentElement.style.setProperty("--app-header-height", h);
    return () => {
      document.documentElement.style.setProperty("--app-header-height", "0px");
    };
  }, [showBreadcrumbs]);

  function handleLogout() {
    lsRemove("bcq.identity");
    setIdentity(null);
    window.location.reload();
  }

  return (
    <header className="sticky top-0 z-50 bg-[#f8f5ef]/95 backdrop-blur-sm">
      <div>
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 md:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-sm border border-[#d6ccbe] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2f2a24] transition-colors hover:bg-[#f3ede4]"
            >
              <Home className="h-3.5 w-3.5" />
              Home
            </Link>
            <Link
              href={adminKey ? `/admin?key=${encodeURIComponent(adminKey)}` : "/admin"}
              className="inline-flex items-center gap-1.5 rounded-sm border border-[#d6ccbe] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2f2a24] transition-colors hover:bg-[#f3ede4]"
            >
              <Shield className="h-3.5 w-3.5" />
              Admin
            </Link>
          </div>

          {identity?.name ? (
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-1.5 rounded-sm border border-[#d6ccbe] bg-white px-2.5 py-1.5 sm:inline-flex">
                <User className="h-3.5 w-3.5 text-[#6f6559]" />
                <span className="max-w-[12rem] truncate text-xs font-medium text-[#2f2a24]">{identity.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center rounded-sm border border-[#d6ccbe] bg-white p-1.5 text-[#5f564c] transition-colors hover:bg-[#f3ede4] hover:text-[#1d1b18]"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {showBreadcrumbs ? (
        <div>
          <div className="mx-auto flex w-full max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2 text-xs text-[#6f6559] md:px-6">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <div key={crumb.href} className="inline-flex items-center gap-1 whitespace-nowrap">
                  {i > 0 ? <ChevronRight className="h-3.5 w-3.5 text-[#9a8d7c]" /> : null}
                  {isLast ? (
                    <span className="font-medium text-[#2f2a24]">{crumb.label}</span>
                  ) : (
                    <Link className="transition-colors hover:text-[#1d1b18]" href={crumb.href}>
                      {crumb.label}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}
