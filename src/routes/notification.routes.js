import { Router } from "express";
import { markAllRead, markRead, myNotifications } from "../controllers/notification.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Ver mis notificaciones
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notificaciones obtenidas correctamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * /api/notifications/read-all:
 *   patch:
 *     summary: Marcar todas las notificaciones como leidas
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notificaciones marcadas como leidas
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Marcar una notificacion como leida
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notificacion marcada como leida
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.use(authMiddleware);
router.get("/", myNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);

export default router;
