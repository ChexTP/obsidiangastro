import { supabaseAdmin } from "../db.js";

export const findSubscriptionByTenant = async (tenantId) => {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select(`id, status, trial_ends_at, current_period_starts_at, current_period_ends_at, grace_ends_at, overrides, plans (id, code, name, limits)`)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw error;
  return data;
};
