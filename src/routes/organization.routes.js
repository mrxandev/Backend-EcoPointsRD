import { Router } from "express";
import { getOrganization, listOrganizations } from "../controllers/organization.controller.js";

const router = Router();

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: Listar organizaciones activas
 *     tags: [Organizations]
 *     responses:
 *       200:
 *         description: Organizaciones obtenidas correctamente
 * /api/organizations/{id}:
 *   get:
 *     summary: Ver detalle de organizacion
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Organizacion obtenida correctamente
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/", listOrganizations);
router.get("/:id", getOrganization);

export default router;
