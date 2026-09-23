import type { Response } from "express";

export function ok<T>(res: Response, data: T, status = 200, extra?: Record<string, unknown>) {
  return res.status(status).json({ success: true, data, ...(extra || {}) });
}

export function fail(res: Response, message: string, status = 400, errors?: unknown) {
  return res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });
}

export function unauthorized(res: Response, message = "Authentication required") {
  return fail(res, message, 401);
}

export function forbidden(res: Response, message = "Access denied") {
  return fail(res, message, 403);
}

export function notFound(res: Response, message = "Not found") {
  return fail(res, message, 404);
}

export function serverError(res: Response, message = "Something went wrong") {
  return fail(res, message, 500);
}
