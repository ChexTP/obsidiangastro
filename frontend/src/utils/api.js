const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const apiRequest = async (path, options = {}) => {
  const session = getSession();
  const tenantId = getTenant();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "No fue posible completar la solicitud");
  return data;
};

const SESSION_KEY = "obsidian-mesa-session";
const TENANT_KEY = "obsidian-mesa-tenant";
export const getSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } };
export const saveSession = (session) => localStorage.setItem(SESSION_KEY, JSON.stringify(session));
export const removeSession = () => { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(TENANT_KEY); };
export const saveTenant = (id) => localStorage.setItem(TENANT_KEY, id);
export const getTenant = () => localStorage.getItem(TENANT_KEY);
