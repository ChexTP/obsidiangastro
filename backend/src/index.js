import app from "./app.js";
import { HOST, PORT } from "./config.js";

const server = app.listen(PORT, HOST, () => {
  console.log(`Servidor Restaurant SaaS escuchando en http://${HOST}:${PORT}`);
});

const shutdown = (signal) => {
  console.log(`Cerrando servidor por ${signal}`);
  server.close(() => process.exit(0));
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
