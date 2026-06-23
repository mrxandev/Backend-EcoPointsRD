import { Router } from "express";
import { register, login, getProfile } from "../controllers/auth.controller.js";

import {authMiddleware,authorizeRoles} from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get("/profile", authMiddleware, getProfile);

router.get(
  "/admin/test",
  authMiddleware,
  authorizeRoles("ADMIN"),
  (req, res) => {
    res.json({
      message: "Acceso permitido solo para ADMIN",
      user: req.user,
    });
  },
);

router.get(
  "/validator/test",
  authMiddleware,
  authorizeRoles("VALIDATOR", "ADMIN"),
  (req, res) => {
    res.json({
      message: "Acceso permitido para VALIDATOR o ADMIN",
      user: req.user,
    });
  },
);

export default router;
