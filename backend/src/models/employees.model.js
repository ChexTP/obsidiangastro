import { createUserSupabaseClient, supabaseAdmin } from "../db.js";

export const listEmployeesByTenant = async (tenantId) => {
  const { data: memberships, error } = await supabaseAdmin
    .from("tenant_memberships")
    .select("id, tenant_id, user_id, role, status, invited_by, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const userIds = (memberships || []).map((membership) => membership.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, email, display_name")
    .in("user_id", userIds);
  if (profileError) throw profileError;
  const profileByUser = new Map((profiles || []).map((profile) => [profile.user_id, profile]));

  return memberships.map((membership) => ({
    ...membership,
    profile: profileByUser.get(membership.user_id) || null,
  }));
};

export const inviteEmployee = async ({ accessToken, tenantId, email, displayName, role, redirectTo }) => {
  const { data: invitation, error: invitationError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    { data: { display_name: displayName }, redirectTo }
  );
  if (invitationError) throw invitationError;

  const invitedUserId = invitation.user?.id;
  if (!invitedUserId) throw new Error("Supabase no devolvio el usuario invitado");

  try {
    const supabaseUser = createUserSupabaseClient(accessToken);
    const { data, error } = await supabaseUser.rpc("invite_tenant_member", {
      p_tenant_id: tenantId,
      p_user_id: invitedUserId,
      p_role: role,
      p_display_name: displayName,
    });
    if (error) throw error;
    return { ...data, userId: invitedUserId, email };
  } catch (error) {
    await supabaseAdmin.auth.admin.deleteUser(invitedUserId);
    throw error;
  }
};

export const createEmployeeAccount = async ({accessToken,tenantId,email,password,displayName,role}) => {
  const {data:created,error:createError}=await supabaseAdmin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:displayName}});
  if(createError)throw createError;const userId=created.user?.id;if(!userId)throw new Error("No fue posible crear el usuario");
  try{
    const supabaseUser=createUserSupabaseClient(accessToken);
    const{error}=await supabaseUser.rpc("invite_tenant_member",{p_tenant_id:tenantId,p_user_id:userId,p_role:role,p_display_name:displayName});if(error)throw error;
    const{error:activeError}=await supabaseAdmin.from("tenant_memberships").update({status:"active"}).eq("tenant_id",tenantId).eq("user_id",userId);if(activeError)throw activeError;
    return{userId,email,role,status:"active"};
  }catch(error){await supabaseAdmin.auth.admin.deleteUser(userId);throw error}
};

export const findMembershipById = async ({ tenantId, membershipId }) => {
  const { data, error } = await supabaseAdmin
    .from("tenant_memberships")
    .select("id, tenant_id, user_id, role, status")
    .eq("tenant_id", tenantId)
    .eq("id", membershipId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const countActiveOwners = async (tenantId) => {
  const { count, error } = await supabaseAdmin
    .from("tenant_memberships")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("role", "owner")
    .eq("status", "active");
  if (error) throw error;
  return count || 0;
};

export const updateMembership = async ({ tenantId, membershipId, role, status }) => {
  const values = { updated_at: new Date().toISOString() };
  if (role !== undefined) values.role = role;
  if (status !== undefined) values.status = status;

  const { data, error } = await supabaseAdmin
    .from("tenant_memberships")
    .update(values)
    .eq("tenant_id", tenantId)
    .eq("id", membershipId)
    .select("id, tenant_id, user_id, role, status, updated_at")
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const acceptInvitation = async ({ accessToken, tenantId }) => {
  const supabaseUser = createUserSupabaseClient(accessToken);
  const { data, error } = await supabaseUser.rpc("accept_tenant_invitation", {
    p_tenant_id: tenantId,
  });
  if (error) throw error;
  return data;
};
