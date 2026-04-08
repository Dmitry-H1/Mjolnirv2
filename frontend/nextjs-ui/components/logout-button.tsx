"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleLogout() {
    setSubmitting(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={submitting}
      className="w-full rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm font-semibold text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {submitting ? "Signing out..." : "Sign out"}
    </button>
  );
}
