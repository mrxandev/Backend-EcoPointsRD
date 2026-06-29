import { Router } from "express";
import { missionStats, pointStats, rewardStats, summary, userStats } from "../controllers/dashboard.controller.js";
import { authMiddleware, authorizeRoles } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @swagger
 * /api/admin/dashboard/summary:
 *   get:
 *     summary: Resumen general del dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen obtenido correctamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 * /api/admin/dashboard/users:
 *   get:
 *     summary: Estadisticas de usuarios
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadisticas de usuarios obtenidas
 * /api/admin/dashboard/missions:
 *   get:
 *     summary: Estadisticas de misiones
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadisticas de misiones obtenidas
 * /api/admin/dashboard/points:
 *   get:
 *     summary: Estadisticas de puntos
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadisticas de puntos obtenidas
 * /api/admin/dashboard/rewards:
 *   get:
 *     summary: Estadisticas de recompensas
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadisticas de recompensas obtenidas
 */
router.use(authMiddleware, authorizeRoles("ADMIN", "AGENT"));
router.get("/summary", summary);
router.get("/users", userStats);
router.get("/missions", missionStats);
router.get("/points", pointStats);
router.get("/rewards", rewardStats);

export default router;
