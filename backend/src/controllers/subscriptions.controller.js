import { findSubscriptionByTenant } from "../models/subscriptions.model.js";

export const getCurrentSubscription = async (req, res) => {
  try {
    const subscription = await findSubscriptionByTenant(req.tenantId);
    if (!subscription) return res.status(404).json({ message: "Suscripcion no encontrada" });
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener la suscripcion", error: error.message });
  }
};
