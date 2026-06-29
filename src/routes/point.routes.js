import { Router } from "express";
import { getBalance, getRanking, getTransactions } from "../controllers/point.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @swagger
 * /api/points/ranking:
 *   get:
 *     summary: Ver ranking de usuarios
 *     tags: [Points]
 *     parameters:
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ranking obtenido correctamente
 * /api/points/balance:
 *   get:
 *     summary: Ver balance de puntos
 *     tags: [Points]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Balance obtenido correctamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * /api/points/transactions:
 *   get:
 *     summary: Ver transacciones de puntos
 *     tags: [Points]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [EARNED, REDEEMED, BONUS, PENALTY]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transacciones obtenidas correctamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/ranking", getRanking);
router.get("/balance", authMiddleware, getBalance);
router.get("/transactions", authMiddleware, getTransactions);

export default router;
