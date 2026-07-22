import { Router } from "express";
import {
  getProfile,
  postForgotPassword,
  postLogin,
  postRegister,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();
router.post("/register", postRegister);
router.post("/login", postLogin);
router.post("/forgot-password", postForgotPassword);
router.get("/me", requireAuth, getProfile);
export default router;
