import { apiRequest, saveSession, saveTenant } from "../utils/api";

export const loginUser = async (credentials) => {
  const result = await apiRequest("/auth/login", { method: "POST", body: JSON.stringify(credentials) });
  saveSession(result.session);
  const profile = await apiRequest("/auth/me");
  if (profile.memberships?.[0]) saveTenant(profile.memberships[0].tenant_id);
  return { profile, needsOnboarding: !profile.memberships?.length };
};

export const registerUser = (data) => apiRequest("/auth/register", { method: "POST", body: JSON.stringify(data) });
export const createRestaurant = async (data) => {
  const result = await apiRequest("/accounts/onboarding", { method: "POST", body: JSON.stringify(data) });
  saveTenant(result.data.tenantId);
  return result;
};
export const getRestaurantProfile = () => apiRequest("/accounts/profile");
export const updateRestaurantProfile = (data) => apiRequest("/accounts/profile", { method: "PATCH", body: JSON.stringify(data) });
