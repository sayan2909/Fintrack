import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: true, data, ...extra }, { status });
}

export function fail(message: string, status = 400, errors?: unknown) {
  return NextResponse.json({ success: false, message, ...(errors ? { errors } : {}) }, { status });
}

export function unauthorized(message = "Authentication required") {
  return fail(message, 401);
}

export function forbidden(message = "Access denied") {
  return fail(message, 403);
}

export function notFound(message = "Not found") {
  return fail(message, 404);
}

export function serverError(message = "Something went wrong") {
  return fail(message, 500);
}
