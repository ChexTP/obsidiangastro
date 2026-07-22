import { testConnection } from "../db.js";

export const getHealth = async (req, res) => {
  res.json({ status: "ok", service: "restaurant-saas-backend", timestamp: new Date().toISOString() });
};

export const getDatabaseHealth = async (req, res) => {
  try {
    await testConnection();
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(503).json({ status: "error", database: "disconnected", error: error.message });
  }
};
