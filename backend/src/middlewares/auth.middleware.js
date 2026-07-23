import { supabaseAdmin } from "../db.js";
import { SAAS_ADMIN_EMAILS } from "../config.js";

const getBearerToken = (authorization) => {
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
};

export const requireAuth = async (req, res, next) => {
  const accessToken = getBearerToken(req.headers.authorization);
  if (!accessToken) return res.status(401).json({ message: "Token requerido" });

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data.user) {
      return res.status(401).json({ message: "Token invalido o vencido" });
    }
    req.accessToken = accessToken;
    req.user = { id: data.user.id, email: data.user.email || null };
    next();
  } catch (error) {
    res.status(503).json({ message: "No fue posible validar la sesion", error: error.message });
  }
};

export const requireRoles = (...roles) => (req, res, next) => {
  if (!req.membership || !roles.includes(req.membership.role)) {
    return res.status(403).json({ message: "No tiene permisos para esta accion" });
  }
  next();
};

export const requirePlatformAdmin = (req, res, next) => {
  if (!req.user?.email || !SAAS_ADMIN_EMAILS.includes(req.user.email.toLowerCase())) {
    return res.status(403).json({ message: "Acceso exclusivo para administradores de la plataforma" });
  }
  next();
};
