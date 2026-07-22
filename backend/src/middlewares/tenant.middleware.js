import { findActiveMembership } from "../models/accounts.model.js";

export const requireTenant = async (req, res, next) => {
  const tenantId = req.headers["x-tenant-id"];
  if (!tenantId) {
    return res.status(400).json({ message: "La cabecera X-Tenant-Id es obligatoria" });
  }

  try {
    const membership = await findActiveMembership({ userId: req.user.id, tenantId });
    if (!membership) {
      return res.status(403).json({ message: "No tiene acceso a este restaurante" });
    }
    req.tenantId = tenantId;
    req.membership = membership;
    next();
  } catch (error) {
    res.status(500).json({ message: "Error al validar el restaurante", error: error.message });
  }
};
