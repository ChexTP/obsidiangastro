import { config as loadEnvironment } from "dotenv";

loadEnvironment();

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`La variable de entorno ${name} es obligatoria`);
  return value;
};

export const NODE_ENV = process.env.NODE_ENV || "development";
export const PORT = Number(process.env.PORT || 4000);
export const HOST = process.env.HOST || "0.0.0.0";
export const SUPABASE_URL = required("SUPABASE_URL");
export const SUPABASE_ANON_KEY = required("SUPABASE_ANON_KEY");
export const SUPABASE_SERVICE_ROLE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
export const PUBLIC_WEB_URL = process.env.PUBLIC_WEB_URL || "http://localhost:3000";
export const SAAS_ADMIN_EMAILS = (process.env.SAAS_ADMIN_EMAILS || "")
  .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
export const ALLOWED_ORIGINS = Array.from(new Set([
  ...(process.env.ALLOWED_ORIGINS || "").split(","),
  FRONTEND_URL,
  PUBLIC_WEB_URL,
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
].map((origin) => origin.trim()).filter(Boolean)));
