import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, getSession, removeSession } from "../utils/api";
import { loginUser } from "../controllers/authController";

const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!getSession()) { setLoading(false); return; }
    apiRequest("/auth/me").then((data) => { setUser(data.user); setMemberships(data.memberships || []); setIsPlatformAdmin(Boolean(data.isPlatformAdmin)); })
      .catch(removeSession).finally(() => setLoading(false));
  }, []);
  const login = async (credentials) => {
    const result = await loginUser(credentials);
    setUser(result.profile.user); setMemberships(result.profile.memberships || []); setIsPlatformAdmin(Boolean(result.profile.isPlatformAdmin));
    return result;
  };
  const logout = () => { removeSession(); setUser(null); setMemberships([]); setIsPlatformAdmin(false); };
  const value = useMemo(() => ({ user, memberships, isPlatformAdmin, loading, login, logout, isAuthenticated: Boolean(user) }), [user, memberships, isPlatformAdmin, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
