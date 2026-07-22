import { Router } from "express";
import { getProfile, patchProfile, postOnboarding } from "../controllers/accounts.controller.js";
import { requireAuth, requireRoles } from "../middlewares/auth.middleware.js";
import { requireTenant } from "../middlewares/tenant.middleware.js";

const router = Router();
router.post("/onboarding", requireAuth, postOnboarding);
router.get("/profile", requireAuth, requireTenant, getProfile);
router.patch("/profile", requireAuth, requireTenant, requireRoles("owner","admin"), patchProfile);
export default router;
