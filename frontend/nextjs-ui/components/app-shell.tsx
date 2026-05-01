"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@/lib/contracts";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <rect x="2" y="2" width="7" height="7" rx="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/logs",
    label: "Log Explorer",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path
          fillRule="evenodd"
          d="M3 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm0 4a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm0 4a1 1 0 0 1 1-1h7a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    href: "/ingest",
    label: "Log Ingestion",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path fillRule="evenodd" d="M3 17a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm3.293-7.707a1 1 0 0 1 1.414 0L9 10.586V3a1 1 0 1 1 2 0v7.586l1.293-1.293a1 1 0 1 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414z" clipRule="evenodd" transform="rotate(180, 10, 10)" />
      </svg>
    ),
  },
  {
    href: "/anomalies",
    label: "Anomalies",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-1-3a1 1 0 0 1-1-1V8a1 1 0 1 1 2 0v1a1 1 0 0 1-1 1z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path
          fillRule="evenodd"
          d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-7 9a7 7 0 1 1 14 0H3z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

function SidebarContent({
  pathname,
  user,
  onNav,
  hideLogo,
}: {
  pathname: string;
  user: User | null;
  onNav?: () => void;
  hideLogo?: boolean;
}) {
  async function handleLogout() {
    const { default: logOut } = await import("@/app/api/authentication/logOut");
    await logOut();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo — hidden when drawer header already shows it */}
      {!hideLogo && (
        <div className="px-6 pt-8 pb-6 flex items-center gap-3">
          <img
            src="/mjolnir-logo.png"
            alt="Mjolnir"
            style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }}
          />
          <div>
            <div
              className="display-title text-2xl font-bold tracking-tight"
              style={{ color: "var(--accent)" }}
            >
              Mjolnir
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Log Intelligence Platform
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNav}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: active ? "var(--accent-soft)" : "transparent",
                color: active ? "var(--accent)" : "var(--muted)",
              }}
            >
              <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Sign out */}
      <div
        className="px-3 pb-6 pt-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              {user.username[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div
                className="text-sm font-medium truncate"
                style={{ color: "var(--text)" }}
              >
                {user.username}
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                {user.role}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: "var(--muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--danger)";
            (e.currentTarget as HTMLElement).style.background = "rgba(158,47,47,0.08)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--muted)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path
              fillRule="evenodd"
              d="M3 4a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H5v10h5a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1V4zm10.293 3.293a1 1 0 0 1 1.414 0l3 3a1 1 0 0 1 0 1.414l-3 3a1 1 0 0 1-1.414-1.414L14.586 11H8a1 1 0 1 1 0-2h6.586l-1.293-1.293a1 1 0 0 1 0-1.414z"
              clipRule="evenodd"
            />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    import("@/app/api/authFetch").then(({ default: authFetch }) => {
      authFetch.get<User>("/auth/me").then((r) => setUser(r.data)).catch(() => {});
    });
  }, []);

  useEffect(() => {
    const handler = () => router.replace("/login");
    window.addEventListener("mjolnir:logout", handler);
    return () => window.removeEventListener("mjolnir:logout", handler);
  }, [router]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="app-shell">
      {/* ── Desktop sidebar ── */}
      <aside
        className="glass-panel hidden md:flex flex-col"
        style={{
          borderRadius: 0,
          borderRight: "1px solid var(--border)",
          borderTop: "none",
          borderBottom: "none",
          borderLeft: "none",
        }}
      >
        <SidebarContent pathname={pathname} user={user} />
      </aside>

      {/* ── Mobile: top bar + drawer ── */}
      <div className="md:hidden mobile-topbar glass-panel flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img
            src="/mjolnir-logo.png"
            alt="Mjolnir"
            style={{ width: 24, height: 24, objectFit: "contain" }}
          />
          <div
            className="display-title text-xl font-bold"
            style={{ color: "var(--accent)" }}
          >
            Mjolnir
          </div>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-xl"
          style={{ color: "var(--muted)" }}
          aria-label="Open menu"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width="22" height="22">
            <path
              fillRule="evenodd"
              d="M3 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm0 4a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm0 4a1 1 0 0 1 1-1h7a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40"
            style={{ background: "rgba(30,26,22,0.4)", backdropFilter: "blur(2px)" }}
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer */}
          <div
            className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 glass-panel flex flex-col"
            style={{ borderRadius: 0, borderLeft: "none" }}
          >
            {/* Drawer header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <img
                  src="/mjolnir-logo.png"
                  alt="Mjolnir"
                  style={{ width: 24, height: 24, objectFit: "contain" }}
                />
                <div
                  className="display-title text-xl font-bold"
                  style={{ color: "var(--accent)" }}
                >
                  Mjolnir
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg"
                style={{ color: "var(--muted)" }}
                aria-label="Close menu"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            {/* Scrollable nav content */}
            <div className="flex-1 overflow-y-auto">
              <SidebarContent
                pathname={pathname}
                user={user}
                onNav={() => setDrawerOpen(false)}
                hideLogo
              />
            </div>
          </div>
        </>
      )}

      {/* ── Main content ── */}
      <main className="app-main">{children}</main>
    </div>
  );
}
