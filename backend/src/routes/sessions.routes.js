import { Router } from "express";
import {
  deleteSession,
  getSessions,
  postHeartbeat,
  postSession,
} from "../controllers/sessions.controller.js";
import { requireAuth, requireRoles } from "../middlewares/auth.middleware.js";
import { requireTenant } from "../middlewares/tenant.middleware.js";

const router = Router();

router.get("/", requireAuth, requireTenant, requireRoles("owner", "admin"), getSessions);
router.post("/", requireAuth, requireTenant, postSession);
router.post("/:id/heartbeat", requireAuth, requireTenant, postHeartbeat);
router.delete("/:id", requireAuth, requireTenant, deleteSession);

export default router;
