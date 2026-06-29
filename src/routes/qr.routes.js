import { Router } from "express";
import { generateQr, validateQr } from "../controllers/qr.controller.js";
import { authMiddleware, authorizeRoles } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @swagger
 * /api/qr/generate:
 *   post:
 *     summary: Generar QR dinamico
 *     tags: [QR]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: QR generado correctamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * /api/qr/validate:
 *   post:
 *     summary: Validar QR
 *     tags: [QR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: QR valido
 *       400:
 *         description: QR invalido, usado o expirado
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post("/generate", authMiddleware, generateQr);
router.post("/validate", authMiddleware, authorizeRoles("AUDITOR", "AGENT", "ADMIN"), validateQr);

export default router;
