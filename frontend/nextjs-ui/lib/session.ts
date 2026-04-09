import { cookies } from "next/headers";

// The backend sets an HttpOnly `refresh_token` cookie on login.
// We use its presence as the server-side signal that the user is authenticated.
export async function getSessionUser(): Promise<{ loggedIn: true } | null> {
  const cookieStore = cookies();
  const hasRefresh = cookieStore.has("refresh_token");
  return hasRefresh ? { loggedIn: true } : null;
}
