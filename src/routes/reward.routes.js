import { Router } from "express";
import { getReward, listRewards, myRedemptions, redeemReward } from "../controllers/reward.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @swagger
 * /api/rewards:
 *   get:
 *     summary: Listar recompensas activas
 *     tags: [Rewards]
 *     responses:
 *       200:
 *         description: Recompensas obtenidas correctamente
 * /api/rewards/my/redemptions:
 *   get:
 *     summary: Ver mis canjes
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Canjes obtenidos correctamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * /api/rewards/{id}:
 *   get:
 *     summary: Ver detalle de recompensa
 *     tags: [Rewards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Recompensa obtenida correctamente
 *       404:
 *         $ref: '#/components/responses/NotFound'
 * /api/rewards/{id}/redeem:
 *   post:
 *     summary: Canjear recompensa
 *     tags: [Rewards]
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
 *       201:
 *         description: Recompensa canjeada correctamente
 *       400:
 *         description: Recompensa no disponible o puntos insuficientes
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/my/redemptions", authMiddleware, myRedemptions);
router.get("/", listRewards);
router.get("/:id", getReward);
router.post("/:id/redeem", authMiddleware, redeemReward);

export default router;
