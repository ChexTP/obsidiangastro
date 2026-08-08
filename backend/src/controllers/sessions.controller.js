import {
  closeSession,
  heartbeatSession,
  listSessionsByTenant,
  openSession,
} from "../models/sessions.model.js";

const sessionKinds = ["mobile", "admin_web", "cashier_web", "kitchen_web"];

export const getSessions = async (req, res) => {
  try {
    res.json(await listSessionsByTenant(req.tenantId));
  } catch (error) {
    res.status(500).json({ message: "Error al obtener sesiones", error: error.message });
  }
};

export const postSession = async (req, res) => {
  try {
    const { kind, deviceFingerprint } = req.body;
    if (!sessionKinds.includes(kind) || !deviceFingerprint || deviceFingerprint.trim().length < 8) {
      return res.status(400).json({ message: "Tipo de sesion e identificador de dispositivo validos son obligatorios" });
    }
    const session = await openSession({ accessToken: req.accessToken, tenantId: req.tenantId, sessionData: req.body });
    res.status(201).json({ message: "Sesion abierta correctamente", data: session });
  } catch (error) {
    const detail = error.message?.toLowerCase() || "";
    if (detail.includes("subscription is not active")) {
      return res.status(403).json({ message: "La suscripción o el periodo de prueba del restaurante está vencido" });
    }
    if (detail.includes("concurrent session limit reached")) {
      return res.status(409).json({ message: "Ya están en uso las conexiones móviles permitidas por el plan" });
    }
    res.status(400).json({ message: "No fue posible registrar este dispositivo", error: error.message });
  }
};

export const postHeartbeat = async (req, res) => {
  try {
    const lastSeenAt = await heartbeatSession({ accessToken: req.accessToken, sessionId: req.params.id });
    res.json({ message: "Sesion renovada", data: { lastSeenAt } });
  } catch (error) {
    res.status(404).json({ message: "Sesion activa no encontrada", error: error.message });
  }
};

export const deleteSession = async (req, res) => {
  try {
    const closed = await closeSession({ accessToken: req.accessToken, sessionId: req.params.id });
    if (!closed) return res.status(404).json({ message: "Sesion activa no encontrada" });
    res.json({ message: "Sesion cerrada correctamente" });
  } catch (error) {
    res.status(400).json({ message: "No fue posible cerrar la sesion", error: error.message });
  }
};
