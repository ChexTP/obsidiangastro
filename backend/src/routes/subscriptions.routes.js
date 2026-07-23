import { Router } from "express";
import { getCurrentSubscription, getPlans, getPlatformSubscriptions, patchPlan, patchPlatformSubscription } from "../controllers/subscriptions.controller.js";
import { requireAuth, requirePlatformAdmin, requireRoles } from "../middlewares/auth.middleware.js";
import { requireTenant } from "../middlewares/tenant.middleware.js";

const router = Router();
router.get("/current", requireAuth, requireTenant, requireRoles("owner", "admin"), getCurrentSubscription);
router.get("/admin/plans", requireAuth, requirePlatformAdmin, getPlans);
router.patch("/admin/plans/:id", requireAuth, requirePlatformAdmin, patchPlan);
router.get("/admin", requireAuth, requirePlatformAdmin, getPlatformSubscriptions);
router.patch("/admin/:id", requireAuth, requirePlatformAdmin, patchPlatformSubscription);
export default router;
