import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(159,59,39,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(41,91,63,0.14),_transparent_28%)]" />
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="fade-up hidden lg:block">
          <p className="display-title text-sm uppercase tracking-[0.32em] text-[color:var(--accent)]">
            Mjolnir Control Room
          </p>
          <h1 className="display-title mt-5 max-w-xl text-5xl font-semibold leading-tight text-[color:var(--surface-dark)]">
            Rebuilt for faster decisions, cleaner flows, and saner incident triage.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--muted)]">
            This new frontend keeps authentication predictable, pulls log data
            through one path, and gives your team a clearer view of what BigQuery
            is returning.
          </p>
        </section>
        <div className="fade-up-delay">{children}</div>
      </div>
    </div>
  );
}
