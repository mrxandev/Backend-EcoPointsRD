import { Router } from "express";
import {
  createUserByAdmin,
  getAuditLogDetail,
  getAuditLogs,
  getDashboard,
  getUserDetail,
  getUsers,
  updateUserByAdmin,
  updateUserRole,
  updateUserStatus,
} from "../controllers/admin.controller.js";
import { authMiddleware, authorizeRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authMiddleware, authorizeRoles("ADMIN"));

router.get("/dashboard", getDashboard);

router.get("/audit-logs", getAuditLogs);
router.get("/audit-logs/:id", getAuditLogDetail);

router.post("/users", createUserByAdmin);
router.get("/users", getUsers);
router.get("/users/:id", getUserDetail);
router.patch("/users/:id", updateUserByAdmin);
router.patch("/users/:id/role", updateUserRole);
router.patch("/users/:id/status", updateUserStatus);

export default router;
