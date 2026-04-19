"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { API_BASE_URL } from "@/app/constants";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("access_token")) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, {
        username,
        email,
        password,
        role: "USER",
      });
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 1500);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "rgba(255,251,245,0.9)",
    borderColor: "var(--border)",
    color: "var(--text)",
  };

  return (
    <div className="glass-panel rounded-2xl p-8 w-full max-w-md fade-up">
      <div className="mb-8 text-center">
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
        Create your account
      </h1>

      {success ? (
        <div
          className="px-4 py-4 rounded-xl text-sm text-center"
          style={{ background: "rgba(41,91,63,0.1)", color: "var(--success)" }}
        >
          Account created! Redirecting to sign in…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { id: "username", label: "Username", type: "text",     value: username, set: setUsername, placeholder: "choose a username" },
            { id: "email",    label: "Email",    type: "email",    value: email,    set: setEmail,    placeholder: "you@example.com" },
            { id: "password", label: "Password", type: "password", value: password, set: setPassword, placeholder: "••••••••" },
            { id: "confirm",  label: "Confirm Password", type: "password", value: confirm, set: setConfirm, placeholder: "••••••••" },
          ].map((f) => (
            <div key={f.id}>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--muted)" }}
              >
                {f.label}
              </label>
              <input
                type={f.type}
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                required
                placeholder={f.placeholder}
                className="w-full px-4 py-2.5 rounded-xl border outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          ))}

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
            className="w-full py-2.5 rounded-xl font-semibold display-title transition-opacity"
            style={{
              background: "var(--accent)",
              color: "#fff",
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      )}

      <p
        className="mt-6 text-center text-sm"
        style={{ color: "var(--muted)" }}
      >
        Already have an account?{" "}
        <Link
          href="/login"
          style={{ color: "var(--accent)" }}
          className="font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
