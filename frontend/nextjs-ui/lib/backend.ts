import type { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  "http://127.0.0.1:8000";

export const ACCESS_COOKIE = "mj_access_token";
export const REFRESH_COOKIE = "mj_refresh_token";

export const accessCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60,
};

export const refreshCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export async function backendFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });
}

export async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch (_error) {
    return null;
  }
}

export async function loginToBackend(username: string, password: string) {
  const response = await backendFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  return {
    response,
    body: await parseJsonSafe<{
      access_token?: string;
      refresh_token?: string;
      detail?: string;
    }>(response),
  };
}

export async function registerWithBackend(username: string, password: string) {
  const response = await backendFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  return {
    response,
    body: await parseJsonSafe<{ detail?: string }>(response),
  };
}

export async function fetchAuthed<T>(path: string, accessToken: string) {
  const response = await backendFetch(path, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return {
    response,
    body: await parseJsonSafe<T & { detail?: string }>(response),
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const response = await backendFetch("/auth/refresh", {
    method: "POST",
    headers: { Cookie: `refresh_token=${refreshToken}` },
  });

  return {
    response,
    body: await parseJsonSafe<{ access_token?: string; detail?: string }>(response),
  };
}

export async function fetchWithSessionRefresh<T>(
  path: string,
  tokens: { accessToken?: string | null; refreshToken?: string | null }
) {
  if (tokens.accessToken) {
    const firstAttempt = await fetchAuthed<T>(path, tokens.accessToken);

    if (firstAttempt.response.ok) {
      return {
        response: firstAttempt.response,
        body: firstAttempt.body,
        accessToken: tokens.accessToken,
      };
    }

    if (firstAttempt.response.status !== 401 || !tokens.refreshToken) {
      return {
        response: firstAttempt.response,
        body: firstAttempt.body,
        accessToken: tokens.accessToken,
      };
    }
  }

  if (!tokens.refreshToken) {
    return {
      response: new Response(null, { status: 401 }),
      body: null,
      accessToken: null,
    };
  }

  const refresh = await refreshAccessToken(tokens.refreshToken);
  const nextAccessToken = refresh.body?.access_token;

  if (!refresh.response.ok || !nextAccessToken) {
    return {
      response: refresh.response,
      body: refresh.body,
      accessToken: null,
    };
  }

  const retry = await fetchAuthed<T>(path, nextAccessToken);

  return {
    response: retry.response,
    body: retry.body,
    accessToken: nextAccessToken,
  };
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { ...accessCookieOptions, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", {
    ...refreshCookieOptions,
    maxAge: 0,
  });
}

export function setAccessCookie(response: NextResponse, accessToken: string) {
  response.cookies.set(ACCESS_COOKIE, accessToken, accessCookieOptions);
}
