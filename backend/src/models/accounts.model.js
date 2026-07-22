import { createUserSupabaseClient, supabaseAdmin } from "../db.js";

export const listMembershipsByUser = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from("tenant_memberships")
    .select(`tenant_id, role, status, tenants (id, business_name, legal_name, document_type, document_number, verification_digit, billing_email, phone, status, country_code, currency, timezone)`)
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) throw error;
  return data || [];
};

export const findActiveMembership = async ({ userId, tenantId }) => {
  const { data, error } = await supabaseAdmin
    .from("tenant_memberships")
    .select("tenant_id, user_id, role, status")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const createRestaurantAccount = async ({ accessToken, accountData }) => {
  const supabaseUser = createUserSupabaseClient(accessToken);
  const { data, error } = await supabaseUser.rpc("bootstrap_restaurant_account", {
    p_business_name: accountData.businessName,
    p_restaurant_name: accountData.restaurantName,
    p_branch_name: accountData.branchName || "Sede principal",
    p_timezone: accountData.timezone || "America/Bogota",
    p_currency: (accountData.currency || "COP").toUpperCase(),
  });
  if (error) throw error;
  const { error: tenantError } = await supabaseAdmin.from("tenants").update({
    legal_name: accountData.businessName,
    document_type: accountData.documentType,
    document_number: accountData.documentNumber,
    verification_digit: accountData.verificationDigit || null,
    billing_email: accountData.billingEmail,
    phone: accountData.phone,
  }).eq("id", data.tenantId);
  if (tenantError) throw tenantError;
  const { error: branchError } = await supabaseAdmin.from("branches").update({ address: accountData.address, city: accountData.city }).eq("id", data.branchId);
  if (branchError) throw branchError;
  return data;
};

export const getRestaurantProfile = async (tenantId) => {
  const {data:tenant,error}=await supabaseAdmin.from("tenants").select("*").eq("id",tenantId).single();if(error)throw error;
  const {data:restaurant,error:restaurantError}=await supabaseAdmin.from("restaurants").select("*").eq("tenant_id",tenantId).eq("status","active").limit(1).single();if(restaurantError)throw restaurantError;
  const {data:branch,error:branchError}=await supabaseAdmin.from("branches").select("*").eq("tenant_id",tenantId).eq("status","active").limit(1).single();if(branchError)throw branchError;
  return{tenant,restaurant,branch};
};
export const updateRestaurantProfile = async (tenantId,values) => {
  const {tenant={},restaurant={},branch={}}=values;
  if(Object.keys(tenant).length){const{error}=await supabaseAdmin.from("tenants").update(tenant).eq("id",tenantId);if(error)throw error;}
  if(Object.keys(restaurant).length){const{error}=await supabaseAdmin.from("restaurants").update(restaurant).eq("tenant_id",tenantId);if(error)throw error;}
  if(Object.keys(branch).length){const{error}=await supabaseAdmin.from("branches").update(branch).eq("tenant_id",tenantId).eq("status","active");if(error)throw error;}
  return getRestaurantProfile(tenantId);
};
