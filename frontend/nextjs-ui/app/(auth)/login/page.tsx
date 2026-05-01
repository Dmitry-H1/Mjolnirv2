"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { API_BASE_URL } from "@/app/constants";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("access_token")) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/login`,
        { username, password },
        { withCredentials: true }
      );

      localStorage.setItem("access_token", data.access_token);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || "Invalid credentials. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-8 w-full max-w-md fade-up">
      {/* Logo */}
      <div className="mb-8 text-center">
        <img
          src="/mjolnir-logo.png"
          alt="Mjolnir"
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 12px",
            objectFit: "contain",
          }}
        />
        <div
          className="display-title text-4xl font-bold mb-1"
          style={{ color: "var(--accent)" }}
        >
          Mjolnir
        </div>
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          Operational visibility for your logs
        </div>
      </div>

      <h1
        className="display-title text-xl font-semibold mb-6"
        style={{ color: "var(--text)" }}
      >
        Sign in to your workspace
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--muted)" }}
          >
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="your username"
            className="w-full px-4 py-2.5 rounded-xl border outline-none transition-all"
            style={{
              background: "rgba(255,251,245,0.9)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = "var(--accent)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = "var(--border)")
            }
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--muted)" }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-xl border outline-none transition-all"
            style={{
              background: "rgba(255,251,245,0.9)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = "var(--accent)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = "var(--border)")
            }
          />
        </div>

        {error && (
          <div
            className="text-sm px-4 py-3 rounded-xl"
            style={{
              background: "rgba(158, 47, 47, 0.1)",
              color: "var(--danger)",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl font-semibold transition-opacity display-title"
          style={{
            background: "var(--accent)",
            color: "#fff",
            opacity: loading ? 0.6 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: "var(--muted)" }}>
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          style={{ color: "var(--accent)" }}
          className="font-medium"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
