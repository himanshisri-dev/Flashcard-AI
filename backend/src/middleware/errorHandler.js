import { ApiError } from "../utils/apiError.js";
import { env } from "../config/env.js";

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err?.name === "ValidationError") {
    return res.status(400).json({ error: err.message });
  }

  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({ error: `${field} already exists` });
  }

  if (err?.name === "CastError") {
    return res.status(400).json({ error: `Invalid ${err.path}` });
  }

  console.error("[error]", err);
  res.status(500).json({
    error: "Internal server error",
    ...(env.isDev && err?.message ? { message: err.message } : {}),
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}
