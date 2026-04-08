import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  fetchWithSessionRefresh,
  setAccessCookie,
} from "@/lib/backend";
import type { SessionUser } from "@/lib/contracts";

export async function GET() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const result = await fetchWithSessionRefresh<SessionUser>("/auth/me", {
    accessToken,
    refreshToken,
  });

  if (!result.response.ok || !result.body) {
    const response = NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
    clearSessionCookies(response);
    return response;
  }

  const response = NextResponse.json(result.body);

  if (result.accessToken && result.accessToken !== accessToken) {
    setAccessCookie(response, result.accessToken);
  }

  return response;
}
