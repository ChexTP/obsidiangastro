import { Router } from "express";
import { getCurrentSubscription } from "../controllers/subscriptions.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireTenant } from "../middlewares/tenant.middleware.js";

const router = Router();
router.get("/current", requireAuth, requireTenant, getCurrentSubscription);
export default router;
