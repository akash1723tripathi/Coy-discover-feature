import type { Direction, Match, PublicProfile, SwipeResult } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      msg = ((await res.json()) as { error?: string }).error ?? msg;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export const fetchFeed = () =>
  request<{ profiles: PublicProfile[] }>("/api/feed").then((r) => r.profiles);

export const fetchMatches = () =>
  request<{ matches: Match[] }>("/api/matches").then((r) => r.matches);

export const postSwipe = (targetId: string, direction: Direction) =>
  request<SwipeResult>("/api/swipe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ targetId, direction }),
  });

export const resetDemo = () => request<{ ok: true }>("/api/reset", { method: "POST" });
