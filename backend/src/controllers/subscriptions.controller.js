import { findSubscriptionByTenant, listPlans, listPlatformSubscriptions, updatePlan, updatePlatformSubscription } from "../models/subscriptions.model.js";
import { supabaseAdmin } from "../db.js";

export const getCurrentSubscription = async (req, res) => {
  try {
    const subscription = await findSubscriptionByTenant(req.tenantId);
    if (!subscription) return res.status(404).json({ message: "Suscripcion no encontrada" });
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener la suscripcion", error: error.message });
  }
};

export const getPlans = async (_req, res) => {
  try { res.json(await listPlans()); }
  catch (error) { res.status(500).json({ message: "Error al obtener los planes", error: error.message }); }
};

export const getPlatformSubscriptions = async (_req, res) => {
  try { res.json(await listPlatformSubscriptions()); }
  catch (error) { res.status(500).json({ message: "Error al obtener los clientes", error: error.message }); }
};

const statuses = ["trialing", "active", "past_due", "grace_period", "suspended", "cancelled", "archived"];
const dateOrNull = (value) => value ? new Date(value).toISOString() : null;

export const patchPlatformSubscription = async (req, res) => {
  try {
    const { status, planId, trialEndsAt, currentPeriodEndsAt, graceEndsAt, overrides = {} } = req.body;
    if (status && !statuses.includes(status)) return res.status(400).json({ message: "Estado de suscripción inválido" });
    const allowedOverrideKeys = ["restaurants", "branches", "registered_users", "mobile_concurrent_sessions", "admin_web_sessions", "cashier_web_sessions", "kitchen_web_sessions"];
    const cleanOverrides = {};
    for (const [key, value] of Object.entries(overrides)) {
      if (!allowedOverrideKeys.includes(key) || !Number.isInteger(Number(value)) || Number(value) < 0) {
        return res.status(400).json({ message: `Límite inválido: ${key}` });
      }
      cleanOverrides[key] = Number(value);
    }
    const changes = { overrides: cleanOverrides };
    if (status) changes.status = status;
    if (planId) changes.plan_id = planId;
    if (trialEndsAt !== undefined) changes.trial_ends_at = dateOrNull(trialEndsAt);
    if (currentPeriodEndsAt !== undefined) changes.current_period_ends_at = dateOrNull(currentPeriodEndsAt);
    if (graceEndsAt !== undefined) changes.grace_ends_at = dateOrNull(graceEndsAt);
    const result = await updatePlatformSubscription(req.params.id, changes);
    await supabaseAdmin.from("audit_events").insert({ tenant_id: result.tenant_id, actor_user_id: req.user.id, event_type: "subscription.updated", entity_type: "subscription", entity_id: result.id, metadata: changes });
    res.json({ message: "Suscripción actualizada", data: result });
  } catch (error) { res.status(400).json({ message: "No fue posible actualizar la suscripción", error: error.message }); }
};

export const patchPlan = async (req, res) => {
  try {
    const { name, description, isActive, limits } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "El nombre del plan es obligatorio" });
    const cleanLimits = {};
    for (const [key, value] of Object.entries(limits || {})) {
      if (!Number.isInteger(Number(value)) || Number(value) < 0) return res.status(400).json({ message: `Límite inválido: ${key}` });
      cleanLimits[key] = Number(value);
    }
    res.json({ message: "Plan actualizado", data: await updatePlan(req.params.id, { name: name.trim(), description: description?.trim() || null, is_active: Boolean(isActive), limits: cleanLimits }) });
  } catch (error) { res.status(400).json({ message: "No fue posible actualizar el plan", error: error.message }); }
};
