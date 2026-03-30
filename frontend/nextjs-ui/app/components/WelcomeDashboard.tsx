"use client";

import { useState } from "react";
import authFetch from "../api/authentication/authFetch";
import logIn from "../api/authentication/logIn";

function WelcomeDashboard({ username }: { username: string }) {
  const [error, setError] = useState<string | null>(null);

  const handleDemo = async () => {
    const response = await authFetch.get("/demo");
    console.log(response.data);
  };

  const handleLogin = async () => {
    const status = await logIn("t", "t", setError);
    console.log("Login status:", status);
  };

  return (
    <div>
      <h1>Welcome, {username}</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button onClick={handleDemo}>Run Demo</button>
      <button onClick={handleLogin}>Log In</button>
    </div>
  );
}

export default WelcomeDashboard