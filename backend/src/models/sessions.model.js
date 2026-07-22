import { createUserSupabaseClient, supabaseAdmin } from "../db.js";

export const listSessionsByTenant = async (tenantId) => {
  const { data, error } = await supabaseAdmin
    .from("device_sessions")
    .select("id, tenant_id, user_id, branch_id, kind, device_fingerprint, device_name, last_seen_at, revoked_at, created_at")
    .eq("tenant_id", tenantId)
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

export const openSession = async ({ accessToken, tenantId, sessionData }) => {
  const supabaseUser = createUserSupabaseClient(accessToken);
  const { data, error } = await supabaseUser.rpc("open_device_session", {
    p_tenant_id: tenantId,
    p_branch_id: sessionData.branchId || null,
    p_kind: sessionData.kind,
    p_device_fingerprint: sessionData.deviceFingerprint,
    p_device_name: sessionData.deviceName || null,
  });
  if (error) throw error;
  return data;
};

export const heartbeatSession = async ({ accessToken, sessionId }) => {
  const supabaseUser = createUserSupabaseClient(accessToken);
  const { data, error } = await supabaseUser.rpc("heartbeat_device_session", {
    p_session_id: sessionId,
  });
  if (error) throw error;
  return data;
};

export const closeSession = async ({ accessToken, sessionId }) => {
  const supabaseUser = createUserSupabaseClient(accessToken);
  const { data, error } = await supabaseUser.rpc("close_device_session", {
    p_session_id: sessionId,
  });
  if (error) throw error;
  return data;
};
