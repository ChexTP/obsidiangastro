import assert from "node:assert/strict";
import crypto from "node:crypto";
import app from "../src/app.js";
import { createPublicSupabaseClient, createUserSupabaseClient, supabaseAdmin } from "../src/db.js";

const testId = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
const email = `restaurant-smoke-${testId}@example.com`;
const password = `T3st-${crypto.randomBytes(18).toString("base64url")}!`;

let userId = null;
let invitedUserId = null;
let tenantId = null;
let branchId = null;
let server = null;

const requestJson = async (baseUrl, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  return { response, body };
};

const removeTestData = async () => {
  if (tenantId) {
    const tablesInDeletionOrder = [
      ["audit_events", "tenant_id"],
      ["device_sessions", "tenant_id"],
      ["subscriptions", "tenant_id"],
      ["branches", "tenant_id"],
      ["restaurants", "tenant_id"],
      ["tenant_memberships", "tenant_id"],
      ["tenants", "id"],
    ];

    for (const [table, column] of tablesInDeletionOrder) {
      const { error } = await supabaseAdmin.from(table).delete().eq(column, tenantId);
      if (error) throw new Error(`No se pudo limpiar ${table}: ${error.message}`);
    }
  }

  if (userId) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(`No se pudo eliminar el usuario temporal: ${error.message}`);
  }
  if (invitedUserId) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(invitedUserId);
    if (error) throw new Error(`No se pudo eliminar el empleado temporal: ${error.message}`);
  }
};

try {
  server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.ifError(createError);
  assert.ok(created.user?.id);
  userId = created.user.id;

  const login = await requestJson(baseUrl, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.response.status, 200, JSON.stringify(login.body));
  assert.ok(login.body.session?.accessToken);
  const token = login.body.session.accessToken;
  const publicClient = createUserSupabaseClient(token);

  const onboarding = await requestJson(baseUrl, "/api/accounts/onboarding", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      businessName: "Empresa temporal de pruebas",
      restaurantName: "Restaurante temporal",
      branchName: "Sede principal",
      timezone: "America/Bogota",
      currency: "COP",
    }),
  });
  assert.equal(onboarding.response.status, 201, JSON.stringify(onboarding.body));
  tenantId = onboarding.body.data?.tenantId;
  branchId = onboarding.body.data?.branchId;
  assert.ok(tenantId);
  assert.ok(branchId);

  const profile = await requestJson(baseUrl, "/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(profile.response.status, 200, JSON.stringify(profile.body));
  assert.equal(profile.body.memberships.length, 1);
  assert.equal(profile.body.memberships[0].role, "owner");
  assert.equal(profile.body.memberships[0].tenant_id, tenantId);

  const subscription = await requestJson(baseUrl, "/api/subscriptions/current", {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Tenant-Id": tenantId,
    },
  });
  assert.equal(subscription.response.status, 200, JSON.stringify(subscription.body));
  assert.equal(subscription.body.status, "trialing");
  assert.equal(subscription.body.plans.code, "base");

  const tenantHeaders = {
    Authorization: `Bearer ${token}`,
    "X-Tenant-Id": tenantId,
    "Content-Type": "application/json",
  };

  const employees = await requestJson(baseUrl, "/api/employees", { headers: tenantHeaders });
  assert.equal(employees.response.status, 200, JSON.stringify(employees.body));
  assert.equal(employees.body.length, 1);
  assert.equal(employees.body[0].role, "owner");

  const invitedEmail = `restaurant-employee-${testId}@example.com`;
  const invitedPassword = `T3st-${crypto.randomBytes(18).toString("base64url")}!`;
  const { data: invitedAuth, error: invitedAuthError } = await supabaseAdmin.auth.admin.createUser({
    email: invitedEmail,
    password: invitedPassword,
    email_confirm: true,
    user_metadata: { display_name: "Mesero temporal" },
  });
  assert.ifError(invitedAuthError);
  invitedUserId = invitedAuth.user?.id;
  assert.ok(invitedUserId);

  const { data: invitedMembership, error: inviteRpcError } = await publicClient.rpc(
    "invite_tenant_member",
    {
      p_tenant_id: tenantId,
      p_user_id: invitedUserId,
      p_role: "waiter",
      p_display_name: "Mesero temporal",
    }
  );
  assert.ifError(inviteRpcError);
  assert.equal(invitedMembership.status, "invited");

  const inviteeClient = createPublicSupabaseClient();
  const { data: inviteeLogin, error: inviteeLoginError } = await inviteeClient.auth.signInWithPassword({
    email: invitedEmail,
    password: invitedPassword,
  });
  assert.ifError(inviteeLoginError);
  const inviteeToken = inviteeLogin.session?.access_token;
  assert.ok(inviteeToken);

  const accepted = await requestJson(baseUrl, "/api/employees/accept-invitation", {
    method: "POST",
    headers: { Authorization: `Bearer ${inviteeToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId }),
  });
  assert.equal(accepted.response.status, 200, JSON.stringify(accepted.body));

  const inviteeProfile = await requestJson(baseUrl, "/api/auth/me", {
    headers: { Authorization: `Bearer ${inviteeToken}` },
  });
  assert.equal(inviteeProfile.response.status, 200, JSON.stringify(inviteeProfile.body));
  assert.equal(inviteeProfile.body.memberships[0].role, "waiter");
  assert.equal(inviteeProfile.body.memberships[0].status, "active");

  const suspendOnlyOwner = await requestJson(baseUrl, `/api/employees/${employees.body[0].id}`, {
    method: "PATCH",
    headers: tenantHeaders,
    body: JSON.stringify({ status: "suspended" }),
  });
  assert.equal(suspendOnlyOwner.response.status, 409, JSON.stringify(suspendOnlyOwner.body));

  const openMobile = async (fingerprint) => requestJson(baseUrl, "/api/sessions", {
    method: "POST",
    headers: tenantHeaders,
    body: JSON.stringify({
      kind: "mobile",
      branchId,
      deviceFingerprint: fingerprint,
      deviceName: `Movil ${fingerprint}`,
    }),
  });

  const firstMobile = await openMobile("device-test-0001");
  const secondMobile = await openMobile("device-test-0002");
  const thirdMobile = await openMobile("device-test-0003");
  assert.equal(firstMobile.response.status, 201, JSON.stringify(firstMobile.body));
  assert.equal(secondMobile.response.status, 201, JSON.stringify(secondMobile.body));
  assert.equal(thirdMobile.response.status, 409, JSON.stringify(thirdMobile.body));

  const heartbeat = await requestJson(
    baseUrl,
    `/api/sessions/${firstMobile.body.data.sessionId}/heartbeat`,
    { method: "POST", headers: tenantHeaders }
  );
  assert.equal(heartbeat.response.status, 200, JSON.stringify(heartbeat.body));

  const closeFirst = await requestJson(baseUrl, `/api/sessions/${firstMobile.body.data.sessionId}`, {
    method: "DELETE",
    headers: tenantHeaders,
  });
  assert.equal(closeFirst.response.status, 200, JSON.stringify(closeFirst.body));

  const thirdAfterClose = await openMobile("device-test-0003");
  assert.equal(thirdAfterClose.response.status, 201, JSON.stringify(thirdAfterClose.body));

  console.log(JSON.stringify({
    authentication: "ok",
    onboarding: "ok",
    membership: "owner",
    subscription: "trialing",
    plan: "base",
    employees: "ok",
    employeeInvitation: "ok",
    invitationAcceptance: "ok",
    lastOwnerProtection: "ok",
    mobileSessionLimit: "2",
    heartbeat: "ok",
    sessionReplacement: "ok",
  }));
} finally {
  try {
    await removeTestData();
    console.log(JSON.stringify({ cleanup: "ok" }));
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}
