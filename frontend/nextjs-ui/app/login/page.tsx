"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import logIn from "../api/authentication/logIn";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const status = await logIn(username, password, setError);

    if (status === 200) {
      router.push("/");
    }
  };

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Log In</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Log In</button>
      </form>
    </main>
  );
}