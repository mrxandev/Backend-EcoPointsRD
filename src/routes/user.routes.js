import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { getMe, getMyPoints, getMyTransactions, updateMe } from "../controllers/user.controller.js";

const router = Router();

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Ver mi perfil
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido correctamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   put:
 *     summary: Actualizar mi perfil
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               province:
 *                 type: string
 *               municipality:
 *                 type: string
 *               address:
 *                 type: string
 *               profile_image:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil actualizado correctamente
 *       400:
 *         description: No hay campos validos
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * /api/users/me/points:
 *   get:
 *     summary: Ver mis puntos
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Puntos obtenidos correctamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * /api/users/me/transactions:
 *   get:
 *     summary: Ver mi historial de puntos
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historial obtenido correctamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.use(authMiddleware);
router.get("/me", getMe);
router.put("/me", updateMe);
router.get("/me/points", getMyPoints);
router.get("/me/transactions", getMyTransactions);

export default router;
