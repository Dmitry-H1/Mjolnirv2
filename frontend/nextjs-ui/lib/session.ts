import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, backendFetch, fetchAuthed } from "@/lib/backend";
import type { SessionUser } from "@/lib/contracts";

export async function getSessionUser() {
  const accessToken = cookies().get(ACCESS_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  const result = await fetchAuthed<SessionUser>("/auth/me", accessToken);
  return result.response.ok ? result.body : null;
}

export async function requireSessionUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getAuthorizedData<T>(path: string) {
  const accessToken = cookies().get(ACCESS_COOKIE)?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const result = await fetchAuthed<T>(path, accessToken);

  if (!result.response.ok || !result.body) {
    redirect("/login");
  }

  return result.body;
}

export async function getAuthorizedDataOrNull<T>(path: string) {
  const accessToken = cookies().get(ACCESS_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  const result = await fetchAuthed<T>(path, accessToken);
  return result.response.ok ? result.body : null;
}

export async function getPublicData<T>(path: string) {
  const response = await backendFetch(path);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }

  return (await response.json()) as T;
}
