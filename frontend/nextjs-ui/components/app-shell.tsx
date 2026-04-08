import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import type { SessionUser } from "@/lib/contracts";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/logs", label: "Logs" },
];

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="glass-panel relative overflow-hidden border-r px-5 py-6 sm:px-6">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(159,59,39,0.16),_transparent_65%)]" />
        <div className="relative z-10 flex h-full flex-col">
          <div>
            <p className="display-title text-xs uppercase tracking-[0.28em] text-[color:var(--accent)]">
              Mjolnir
            </p>
            <h1 className="display-title mt-3 text-3xl font-semibold text-[color:var(--surface-dark)]">
              Control room
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              Cleaner frontend structure, one auth flow, and lighter data views.
            </p>
          </div>

          <nav className="mt-8 grid gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-transparent bg-white/50 px-4 py-3 text-sm font-semibold text-[color:var(--muted)] transition hover:border-[color:var(--border)] hover:bg-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 rounded-[1.5rem] border border-[color:var(--border)] bg-white/65 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
              Signed in
            </p>
            <p className="mt-2 text-lg font-semibold">{user.username}</p>
            <p className="text-sm text-[color:var(--muted)]">{user.role}</p>
          </div>

          <div className="mt-auto pt-6">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
