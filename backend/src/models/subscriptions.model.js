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

export const listPlans = async () => {
  const { data, error } = await supabaseAdmin.from("plans")
    .select("id, code, name, description, is_active, limits, created_at, updated_at")
    .order("created_at");
  if (error) throw error;
  return data || [];
};

export const listPlatformSubscriptions = async () => {
  const { data, error } = await supabaseAdmin.from("subscriptions")
    .select(`id, tenant_id, plan_id, status, trial_ends_at, current_period_starts_at, current_period_ends_at, grace_ends_at, overrides, created_at, updated_at,
      plans (id, code, name, limits), tenants (id, business_name, legal_name, billing_email, phone, status, created_at)`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

export const updatePlatformSubscription = async (id, changes) => {
  const { data, error } = await supabaseAdmin.from("subscriptions").update(changes)
    .eq("id", id)
    .select(`id, tenant_id, plan_id, status, trial_ends_at, current_period_starts_at, current_period_ends_at, grace_ends_at, overrides,
      plans (id, code, name, limits), tenants (id, business_name, legal_name, billing_email, phone, status)`)
    .single();
  if (error) throw error;
  return data;
};

export const updatePlan = async (id, changes) => {
  const { data, error } = await supabaseAdmin.from("plans").update(changes).eq("id", id).select().single();
  if (error) throw error;
  return data;
};
