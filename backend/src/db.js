import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./config.js";

const sharedOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket },
};

// Cliente administrativo exclusivo del backend. Los modelos deben filtrar
// siempre por usuario y tenant porque esta clave puede omitir RLS.
export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  sharedOptions
);

// Cliente publico para registro e inicio de sesion desde pruebas o procesos
// equivalentes al frontend. Nunca contiene la clave administrativa.
export const createPublicSupabaseClient = () =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, sharedOptions);

// Cliente que conserva la identidad del usuario y permite aplicar RLS.
export const createUserSupabaseClient = (accessToken) =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...sharedOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

export const testConnection = async () => {
  const { data, error } = await supabaseAdmin.from("plans").select("id, code").limit(1);
  if (error) throw error;
  return data;
};
