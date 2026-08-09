import express from "express";
import cors from "cors";
import morgan from "morgan";
import { ALLOWED_ORIGINS } from "./config.js";
import { requestDebugLogger } from "./middlewares/debug.middleware.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import accountsRoutes from "./routes/accounts.routes.js";
import subscriptionsRoutes from "./routes/subscriptions.routes.js";
import employeesRoutes from "./routes/employees.routes.js";
import sessionsRoutes from "./routes/sessions.routes.js";
import operationsRoutes from "./routes/operations.routes.js";
import { notifyOperationsAfterMutation } from "./realtime.js";

const app = express();
app.use(morgan("dev"));
app.use(requestDebugLogger);
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/operations", notifyOperationsAfterMutation, operationsRoutes);

app.use((req, res) => res.status(404).json({ message: "Ruta no encontrada" }));
export default app;
