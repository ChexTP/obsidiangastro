import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main className="app-loading"><div className="brand-mark">O</div><strong>Obsidian Mesa</strong><span>Preparando tu espacio...</span></main>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
