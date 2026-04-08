import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  fetchWithSessionRefresh,
  setAccessCookie,
} from "@/lib/backend";
import type { LogRecord } from "@/lib/contracts";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  const result = await fetchWithSessionRefresh<LogRecord>(`/logs/${params.id}`, {
    accessToken,
    refreshToken,
  });

  if (!result.response.ok || !result.body) {
    const response = NextResponse.json(
      { error: "Unable to load log." },
      { status: result.response.status || 404 }
    );

    if (result.response.status === 401) {
      clearSessionCookies(response);
    }

    return response;
  }

  const response = NextResponse.json(result.body);

  if (result.accessToken && result.accessToken !== accessToken) {
    setAccessCookie(response, result.accessToken);
  }

  return response;
}
