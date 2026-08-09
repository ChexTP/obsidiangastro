import { API_URL, getSession, getTenant } from "./api";

let socket;
let retry;

export const connectOperationsRealtime = () => {
  const session = getSession(), tenantId = getTenant();
  if (!session?.accessToken || !tenantId || socket) return () => {};
  let stopped = false;
  const connect = () => {
    if (stopped) return;
    const url = new URL(API_URL);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/realtime";
    url.search = "";
    socket = new WebSocket(url);
    socket.onopen = () => socket.send(JSON.stringify({ type: "auth", accessToken: getSession()?.accessToken, tenantId: getTenant() }));
    socket.onmessage = (event) => {
      try { if (JSON.parse(event.data).type === "operations.changed") window.dispatchEvent(new CustomEvent("operations:changed")); } catch { /* mensaje desconocido */ }
    };
    socket.onclose = () => { socket = null; if (!stopped) retry = window.setTimeout(connect, 2500); };
  };
  connect();
  return () => { stopped = true; window.clearTimeout(retry); socket?.close(); socket = null; };
};
