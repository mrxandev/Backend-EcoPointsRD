import { Router } from "express";
import {
  cancelRegistration,
  getMission,
  listMissions,
  myRegistrations,
  registerMission,
  rejectMission,
  uploadEvidence,
  validateMission,
} from "../controllers/mission.controller.js";
import { authMiddleware, authorizeRoles } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @swagger
 * /api/missions:
 *   get:
 *     summary: Listar misiones publicadas
 *     tags: [Missions]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *       - in: query
 *         name: municipality
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Misiones obtenidas correctamente
 * /api/missions/my/registrations:
 *   get:
 *     summary: Ver mis misiones inscritas
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mis misiones obtenidas correctamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * /api/missions/{id}:
 *   get:
 *     summary: Ver detalle de mision
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Mision obtenida correctamente
 *       404:
 *         $ref: '#/components/responses/NotFound'
 * /api/missions/{id}/register:
 *   post:
 *     summary: Inscribirse en una mision
 *     tags: [Missions]
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
 *         description: Inscripcion creada correctamente
 *       400:
 *         description: Mision no admite inscripciones o cupo lleno
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: Ya estas inscrito
 *   delete:
 *     summary: Cancelar inscripcion
 *     tags: [Missions]
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
 *         description: Inscripcion cancelada correctamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 * /api/missions/{id}/evidences:
 *   post:
 *     summary: Subir evidencia de mision
 *     tags: [Evidences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [file_url]
 *             properties:
 *               file_url:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Evidencia subida correctamente
 *       400:
 *         description: Evidencia no requerida o datos invalidos
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 * /api/missions/{id}/validate:
 *   post:
 *     summary: Validar participacion en mision
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               qr_token:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Participacion validada correctamente
 *       400:
 *         description: Validacion invalida
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Usuario ya validado para la mision
 * /api/missions/{id}/reject:
 *   post:
 *     summary: Rechazar participacion en mision
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Participacion rechazada correctamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
const optionalAuth = (req, res, next) => {
  if (!req.headers.authorization) return next();
  return authMiddleware(req, res, next);
};

router.get("/my/registrations", authMiddleware, myRegistrations);
router.get("/", listMissions);
router.get("/:id", optionalAuth, getMission);
router.post("/:id/register", authMiddleware, registerMission);
router.delete("/:id/register", authMiddleware, cancelRegistration);
router.post("/:id/evidences", authMiddleware, uploadEvidence);
router.post("/:id/validate", authMiddleware, authorizeRoles("AUDITOR", "AGENT", "ADMIN"), validateMission);
router.post("/:id/reject", authMiddleware, authorizeRoles("AUDITOR", "AGENT", "ADMIN"), rejectMission);

export default router;
