"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AuthMode = "login" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isLogin = mode === "login";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        isLogin ? "/api/auth/login" : "/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error || "The request could not be completed.");
        return;
      }

      router.push(isLogin ? "/dashboard" : "/login");
      router.refresh();
    } catch (_error) {
      setError("Unable to reach the application right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="glass-panel mx-auto w-full max-w-md rounded-[2rem] p-6 sm:p-8">
      <p className="display-title text-xs uppercase tracking-[0.3em] text-[color:var(--accent)]">
        {isLogin ? "Welcome back" : "Create account"}
      </p>
      <h1 className="display-title mt-4 text-3xl font-semibold text-[color:var(--surface-dark)]">
        {isLogin ? "Sign in to Mjolnir" : "Set up access"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
        {isLogin
          ? "Use your existing backend credentials to enter the new workspace."
          : "Accounts are still created through the existing authentication API."}
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-[color:var(--muted)]">
            Username
          </span>
          <input
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white/85 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
            placeholder="ops-user"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[color:var(--muted)]">
            Password
          </span>
          <input
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white/85 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
            placeholder="........"
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-[rgba(158,47,47,0.2)] bg-[rgba(158,47,47,0.08)] px-4 py-3 text-sm text-[color:var(--danger)]">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting
            ? isLogin
              ? "Signing in..."
              : "Creating account..."
            : isLogin
            ? "Sign in"
            : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-[color:var(--muted)]">
        {isLogin ? "Need an account?" : "Already registered?"}{" "}
        <Link
          href={isLogin ? "/signup" : "/login"}
          className="font-semibold text-[color:var(--accent)] underline-offset-4 hover:underline"
        >
          {isLogin ? "Create one" : "Sign in"}
        </Link>
      </p>
    </section>
  );
}
