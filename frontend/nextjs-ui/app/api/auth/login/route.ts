import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  loginToBackend,
  refreshCookieOptions,
} from "@/lib/backend";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await loginToBackend(body.username, body.password);

  if (!result.response.ok || !result.body?.access_token) {
    return NextResponse.json(
      { error: result.body?.detail || "Unable to log in." },
      { status: result.response.status }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, result.body.access_token, accessCookieOptions);

  if (result.body.refresh_token) {
    response.cookies.set(
      REFRESH_COOKIE,
      result.body.refresh_token,
      refreshCookieOptions
    );
  }

  return response;
}
