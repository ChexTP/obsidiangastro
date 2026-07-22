import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, getSession, removeSession } from "../utils/api";
import { loginUser } from "../controllers/authController";

const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!getSession()) { setLoading(false); return; }
    apiRequest("/auth/me").then((data) => { setUser(data.user); setMemberships(data.memberships || []); })
      .catch(removeSession).finally(() => setLoading(false));
  }, []);
  const login = async (credentials) => {
    const result = await loginUser(credentials);
    setUser(result.profile.user); setMemberships(result.profile.memberships || []);
    return result;
  };
  const logout = () => { removeSession(); setUser(null); setMemberships([]); };
  const value = useMemo(() => ({ user, memberships, loading, login, logout, isAuthenticated: Boolean(user) }), [user, memberships, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
