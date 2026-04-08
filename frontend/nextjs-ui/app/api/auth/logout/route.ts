import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  backendFetch,
  clearSessionCookies,
} from "@/lib/backend";

export async function POST() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  await backendFetch("/auth/logout", {
    method: "POST",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(refreshToken ? { Cookie: `refresh_token=${refreshToken}` } : {}),
    },
  }).catch(() => null);

  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
