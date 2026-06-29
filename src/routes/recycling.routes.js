import { Router } from "express";
import { getCenter, listCenters } from "../controllers/recycling.controller.js";

const router = Router();

/**
 * @swagger
 * /api/recycling/centers:
 *   get:
 *     summary: Listar centros de reciclaje
 *     tags: [Recycling]
 *     parameters:
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *       - in: query
 *         name: municipality
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Centros obtenidos correctamente
 * /api/recycling/centers/{id}:
 *   get:
 *     summary: Ver detalle de centro de reciclaje
 *     tags: [Recycling]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Centro obtenido correctamente
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/centers", listCenters);
router.get("/centers/:id", getCenter);

export default router;
