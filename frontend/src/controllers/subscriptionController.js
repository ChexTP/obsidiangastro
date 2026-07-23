import { apiRequest } from "../utils/api";
export const getCurrentSubscription=()=>apiRequest("/subscriptions/current");
export const getDeviceSessions=()=>apiRequest("/sessions");
export const revokeDeviceSession=(id)=>apiRequest(`/sessions/${id}`,{method:"DELETE"});
export const getSaasSubscriptions=()=>apiRequest("/subscriptions/admin");
export const getPlans=()=>apiRequest("/subscriptions/admin/plans");
export const updateSaasSubscription=(id,values)=>apiRequest(`/subscriptions/admin/${id}`,{method:"PATCH",body:JSON.stringify(values)});
export const updateSaasPlan=(id,values)=>apiRequest(`/subscriptions/admin/plans/${id}`,{method:"PATCH",body:JSON.stringify(values)});
