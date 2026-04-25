import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import { required, isEmail, minLen, maxLen } from "../utils/validators.js";

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function publicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email };
}

export async function register(req, res) {
  const { name, email, password } = req.body || {};
  required(req.body, ["name", "email", "password"]);
  isEmail(email);
  minLen(password, 6, "password");
  maxLen(name, 80, "name");

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail }).lean();
  if (existing) throw ApiError.conflict("Email already registered");

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name: name.trim(), email: normalizedEmail, password: hash });

  res.status(201).json({ user: publicUser(user), token: signToken(user._id) });
}

export async function login(req, res) {
  const { email, password } = req.body || {};
  required(req.body, ["email", "password"]);
  isEmail(email);

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw ApiError.unauthorized("Invalid email or password");

  res.json({ user: publicUser(user), token: signToken(user._id) });
}

export async function me(req, res) {
  res.json({ user: req.user });
}
