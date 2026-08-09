import app from "./app.js";
import { HOST, PORT } from "./config.js";
import { createServer } from "node:http";
import { initRealtime } from "./realtime.js";

const server = createServer(app);
initRealtime(server);
server.listen(PORT, HOST, () => {
  console.log(`Servidor Restaurant SaaS escuchando en http://${HOST}:${PORT}`);
});

const shutdown = (signal) => {
  console.log(`Cerrando servidor por ${signal}`);
  server.close(() => process.exit(0));
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
