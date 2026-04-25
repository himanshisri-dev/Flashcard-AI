import { ApiError } from "./apiError.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function required(obj, fields) {
  const missing = fields.filter((f) => {
    const v = obj?.[f];
    return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
  });
  if (missing.length) {
    throw ApiError.badRequest(`Missing required field(s): ${missing.join(", ")}`);
  }
}

export function isEmail(value, field = "email") {
  if (typeof value !== "string" || !EMAIL_RE.test(value)) {
    throw ApiError.badRequest(`Invalid ${field}`);
  }
}

export function minLen(value, n, field) {
  if (typeof value !== "string" || value.length < n) {
    throw ApiError.badRequest(`${field} must be at least ${n} characters`);
  }
}

export function maxLen(value, n, field) {
  if (typeof value === "string" && value.length > n) {
    throw ApiError.badRequest(`${field} must be at most ${n} characters`);
  }
}
