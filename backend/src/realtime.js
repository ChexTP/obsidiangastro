import { WebSocketServer, WebSocket } from "ws";
import { supabaseAdmin } from "./db.js";

let realtimeServer;

export const initRealtime = (server) => {
  realtimeServer = new WebSocketServer({ server, path: "/realtime" });
  realtimeServer.on("connection", (socket) => {
    socket.isAlive = true;
    socket.authenticated = false;
    const authTimeout = setTimeout(() => {
      if (!socket.authenticated) socket.close(4401, "Autenticacion requerida");
    }, 8000);
    socket.on("pong", () => { socket.isAlive = true; });
    socket.on("message", async (raw) => {
      if (socket.authenticated) return;
      try {
        const message = JSON.parse(raw.toString());
        if (message.type !== "auth" || !message.accessToken || !message.tenantId) throw new Error("Credenciales incompletas");
        const { data, error } = await supabaseAdmin.auth.getUser(message.accessToken);
        if (error || !data.user) throw new Error("Token invalido");
        const { data: membership, error: membershipError } = await supabaseAdmin.from("tenant_memberships").select("id").eq("tenant_id", message.tenantId).eq("user_id", data.user.id).eq("status", "active").maybeSingle();
        if (membershipError || !membership) throw new Error("Restaurante no autorizado");
        socket.authenticated = true;
        socket.tenantId = message.tenantId;
        clearTimeout(authTimeout);
        socket.send(JSON.stringify({ type: "connected" }));
      } catch (_) {
        socket.close(4403, "No autorizado");
      }
    });
    socket.on("close", () => clearTimeout(authTimeout));
  });
  const heartbeat = setInterval(() => {
    for (const socket of realtimeServer.clients) {
      if (!socket.isAlive) { socket.terminate(); continue; }
      socket.isAlive = false;
      socket.ping();
    }
  }, 25000);
  realtimeServer.on("close", () => clearInterval(heartbeat));
};

export const notifyTenant = (tenantId, event = "operations.changed") => {
  if (!realtimeServer || !tenantId) return;
  const payload = JSON.stringify({ type: event, occurredAt: new Date().toISOString() });
  for (const socket of realtimeServer.clients) {
    if (socket.readyState === WebSocket.OPEN && socket.authenticated && socket.tenantId === tenantId) socket.send(payload);
  }
};

export const notifyOperationsAfterMutation = (req, res, next) => {
  res.on("finish", () => {
    if (req.method !== "GET" && res.statusCode >= 200 && res.statusCode < 300) notifyTenant(req.tenantId);
  });
  next();
};
