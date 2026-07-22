export type StoredSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

const SESSION_KEY = "obsidian-mesa-session";
const TENANT_KEY = "obsidian-mesa-tenant";

export const getSession = (): StoredSession | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as StoredSession; } catch { return null; }
};

export const saveSession = (session: StoredSession) => {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearSession = () => {
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(TENANT_KEY);
};

export const saveTenant = (tenantId: string) => window.localStorage.setItem(TENANT_KEY, tenantId);
export const getTenant = () => typeof window === "undefined" ? null : window.localStorage.getItem(TENANT_KEY);
