import { NextResponse } from "next/server";
import { ApiError } from "./errors";

/** Never cache: feed/matches change after every swipe. */
const HEADERS = { "Cache-Control": "no-store" };

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: HEADERS });
}

export function handleError(err: unknown) {
  if (err instanceof ApiError) return json({ error: err.message }, err.status);
  console.error(err);
  return json({ error: "Internal server error" }, 500);
}
