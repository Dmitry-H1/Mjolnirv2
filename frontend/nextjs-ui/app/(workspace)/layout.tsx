"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/app-shell";
import axios from "axios";
import { API_BASE_URL } from "@/app/constants";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    // Verify the token is still accepted by the backend.
    // authFetch will attempt a refresh automatically if it gets a 401,
    // and call logOut() if the refresh also fails.
    axios
      .get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      })
      .then(() => setReady(true))
      .catch(() => {
        // access_token expired and refresh_token also expired — boot to login
        localStorage.removeItem("access_token");
        router.replace("/login");
      });
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="text-sm display-title"
          style={{ color: "var(--muted)" }}
        >
          Loading…
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
