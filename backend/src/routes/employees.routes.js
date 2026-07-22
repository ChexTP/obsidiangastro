import { Router } from "express";
import {
  getEmployees,
  patchEmployee,
  postAcceptInvitation,
  postInvitation,
} from "../controllers/employees.controller.js";
import { requireAuth, requireRoles } from "../middlewares/auth.middleware.js";
import { requireTenant } from "../middlewares/tenant.middleware.js";

const router = Router();

router.post("/accept-invitation", requireAuth, postAcceptInvitation);
router.get("/", requireAuth, requireTenant, requireRoles("owner", "admin"), getEmployees);
router.post("/invitations", requireAuth, requireTenant, requireRoles("owner", "admin"), postInvitation);
router.patch("/:id", requireAuth, requireTenant, requireRoles("owner", "admin"), patchEmployee);

export default router;
