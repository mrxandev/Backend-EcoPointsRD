import { Router } from "express";
import {
  createUserByAdmin,
  deleteUser,
  getAuditLogDetail,
  getAuditLogs,
  getUserDetail,
  getUsers,
  setUserStatus,
  updateUserByAdmin,
} from "../controllers/admin.controller.js";
import {
  addOrganizationUser,
  adminListOrganizations,
  createOrganization,
  removeOrganizationUser,
  setOrganizationStatus,
  updateOrganization,
} from "../controllers/organization.controller.js";
import {
  adminCreateMission,
  adminGetMission,
  adminListMissions,
  adminUpdateMission,
  deleteMission,
  listEvidences,
  reviewEvidence,
  setMissionStatus,
} from "../controllers/mission.controller.js";
import { adjustPoints, adminPointTransactions } from "../controllers/point.controller.js";
import {
  adminCreateReward,
  adminListRewards,
  adminRedemptions,
  adminUpdateReward,
  setRedemptionStatus,
  setRewardStatus,
} from "../controllers/reward.controller.js";
import {
  createCenter,
  createRecyclingLog,
  listRecyclingLogs,
  setCenterStatus,
  updateCenter,
} from "../controllers/recycling.controller.js";
import { sendGlobalNotification, sendUserNotification } from "../controllers/notification.controller.js";
import { authMiddleware, authorizeRoles } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Listar usuarios
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *         description: Usuarios obtenidos correctamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   post:
 *     summary: Crear usuario desde admin
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/RegisterRequest'
 *               - type: object
 *                 properties:
 *                   role:
 *                     type: string
 *                     enum: [USER, AGENT, AUDITOR, ADMIN]
 *     responses:
 *       201:
 *         description: Usuario creado correctamente
 *       400:
 *         description: Datos invalidos
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Email o cedula duplicados
 * /api/admin/users/{id}:
 *   get:
 *     summary: Ver detalle de usuario
 *     tags: [Admin Users]
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
 *         description: Usuario obtenido correctamente
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     summary: Actualizar usuario desde admin
 *     tags: [Admin Users]
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
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: Usuario actualizado correctamente
 *       400:
 *         description: Datos invalidos
 *       404:
 *         $ref: '#/components/responses/NotFound'
 * /api/admin/users/{id}/suspend:
 *   patch:
 *     summary: Suspender usuario
 *     tags: [Admin Users]
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
 *         description: Estado actualizado
 * /api/admin/users/{id}/activate:
 *   patch:
 *     summary: Activar usuario
 *     tags: [Admin Users]
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
 *         description: Estado actualizado
 * /api/admin/users/{id}/ban:
 *   patch:
 *     summary: Banear usuario
 *     tags: [Admin Users]
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
 *         description: Estado actualizado
 * /api/admin/organizations:
 *   get:
 *     summary: Listar organizaciones admin
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organizaciones obtenidas correctamente
 *   post:
 *     summary: Crear organizacion
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               organization_type:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               province:
 *                 type: string
 *               municipality:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Organizacion creada correctamente
 * /api/admin/organizations/{id}:
 *   put:
 *     summary: Actualizar organizacion
 *     tags: [Organizations]
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
 *         description: Organizacion actualizada correctamente
 * /api/admin/organizations/{id}/activate:
 *   patch:
 *     summary: Activar organizacion
 *     tags: [Organizations]
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
 *         description: Estado actualizado
 * /api/admin/organizations/{id}/deactivate:
 *   patch:
 *     summary: Desactivar organizacion
 *     tags: [Organizations]
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
 *         description: Estado actualizado
 * /api/admin/organizations/{id}/users:
 *   post:
 *     summary: Asignar usuario a organizacion
 *     tags: [Organizations]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               position:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario asignado
 * /api/admin/organizations/{id}/users/{userId}:
 *   delete:
 *     summary: Quitar usuario de organizacion
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Usuario removido
 * /api/admin/missions:
 *   get:
 *     summary: Listar misiones admin
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Misiones admin obtenidas correctamente
 *   post:
 *     summary: Crear mision
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Mission'
 *     responses:
 *       201:
 *         description: Mision creada correctamente
 * /api/admin/missions/{id}:
 *   get:
 *     summary: Ver detalle administrativo de mision
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
 *         description: Detalle de mision obtenido
 *   put:
 *     summary: Actualizar mision
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
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Mission'
 *     responses:
 *       200:
 *         description: Mision actualizada correctamente
 *   delete:
 *     summary: Eliminar mision
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
 *         description: Mision eliminada correctamente
 * /api/admin/missions/{id}/publish:
 *   patch:
 *     summary: Publicar mision
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
 *         description: Estado actualizado
 * /api/admin/missions/{id}/start:
 *   patch:
 *     summary: Marcar mision en progreso
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
 *         description: Estado actualizado
 * /api/admin/missions/{id}/complete:
 *   patch:
 *     summary: Completar mision
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
 *         description: Estado actualizado
 * /api/admin/missions/{id}/cancel:
 *   patch:
 *     summary: Cancelar mision
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
 *         description: Estado actualizado
 * /api/admin/evidences:
 *   get:
 *     summary: Listar evidencias
 *     tags: [Evidences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: mission_id
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Evidencias obtenidas correctamente
 * /api/admin/evidences/{id}/approve:
 *   patch:
 *     summary: Aprobar evidencia
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
 *     responses:
 *       200:
 *         description: Evidencia revisada correctamente
 * /api/admin/evidences/{id}/reject:
 *   patch:
 *     summary: Rechazar evidencia
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Evidencia revisada correctamente
 * /api/admin/points/adjust:
 *   post:
 *     summary: Ajustar puntos manualmente
 *     tags: [Points]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, points, transaction_type]
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               points:
 *                 type: integer
 *               transaction_type:
 *                 type: string
 *                 enum: [BONUS, PENALTY]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Puntos ajustados correctamente
 * /api/admin/points/transactions:
 *   get:
 *     summary: Ver transacciones de puntos admin
 *     tags: [Points]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transacciones obtenidas correctamente
 * /api/admin/rewards:
 *   get:
 *     summary: Listar recompensas admin
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recompensas admin obtenidas correctamente
 *   post:
 *     summary: Crear recompensa
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Reward'
 *     responses:
 *       201:
 *         description: Recompensa creada correctamente
 * /api/admin/rewards/{id}:
 *   put:
 *     summary: Actualizar recompensa
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Reward'
 *     responses:
 *       200:
 *         description: Recompensa actualizada correctamente
 * /api/admin/rewards/{id}/activate:
 *   patch:
 *     summary: Activar recompensa
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
 *       200:
 *         description: Estado actualizado
 * /api/admin/rewards/{id}/deactivate:
 *   patch:
 *     summary: Desactivar recompensa
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
 *       200:
 *         description: Estado actualizado
 * /api/admin/redemptions:
 *   get:
 *     summary: Listar canjes admin
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Canjes obtenidos correctamente
 * /api/admin/redemptions/{id}/approve:
 *   patch:
 *     summary: Aprobar canje
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
 *       200:
 *         description: Estado de canje actualizado
 * /api/admin/redemptions/{id}/deliver:
 *   patch:
 *     summary: Marcar canje como entregado
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
 *       200:
 *         description: Estado de canje actualizado
 * /api/admin/redemptions/{id}/cancel:
 *   patch:
 *     summary: Cancelar canje
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
 *       200:
 *         description: Estado de canje actualizado
 * /api/admin/recycling/centers:
 *   post:
 *     summary: Crear centro de reciclaje
 *     tags: [Recycling]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               province:
 *                 type: string
 *               municipality:
 *                 type: string
 *               address:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Centro creado correctamente
 * /api/admin/recycling/centers/{id}:
 *   put:
 *     summary: Actualizar centro de reciclaje
 *     tags: [Recycling]
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
 *         description: Centro actualizado correctamente
 * /api/admin/recycling/centers/{id}/activate:
 *   patch:
 *     summary: Activar centro de reciclaje
 *     tags: [Recycling]
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
 *         description: Estado actualizado
 * /api/admin/recycling/centers/{id}/deactivate:
 *   patch:
 *     summary: Desactivar centro de reciclaje
 *     tags: [Recycling]
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
 *         description: Estado actualizado
 * /api/admin/recycling/logs:
 *   get:
 *     summary: Ver logs de reciclaje
 *     tags: [Recycling]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs de reciclaje obtenidos correctamente
 *   post:
 *     summary: Registrar reciclaje manual
 *     tags: [Recycling]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, material_type]
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               center_id:
 *                 type: string
 *                 format: uuid
 *               material_type:
 *                 type: string
 *               weight_kg:
 *                 type: number
 *               points_awarded:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Reciclaje registrado correctamente
 * /api/admin/notifications/user:
 *   post:
 *     summary: Enviar notificacion a usuario
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, title, message]
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notificacion enviada
 * /api/admin/notifications/global:
 *   post:
 *     summary: Enviar notificacion global
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notificacion global enviada
 * /api/admin/logs:
 *   get:
 *     summary: Ver logs del sistema
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: entity_type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Logs obtenidos correctamente
 * /api/admin/logs/{id}:
 *   get:
 *     summary: Ver detalle de log
 *     tags: [Logs]
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
 *         description: Log obtenido correctamente
 */
router.use(authMiddleware);

router.get("/logs", authorizeRoles("ADMIN"), getAuditLogs);
router.get("/logs/:id", authorizeRoles("ADMIN"), getAuditLogDetail);
router.get("/audit-logs", authorizeRoles("ADMIN"), getAuditLogs);
router.get("/audit-logs/:id", authorizeRoles("ADMIN"), getAuditLogDetail);

router.post("/users", authorizeRoles("ADMIN"), createUserByAdmin);
router.get("/users", authorizeRoles("ADMIN"), getUsers);
router.get("/users/:id", authorizeRoles("ADMIN"), getUserDetail);
router.put("/users/:id", authorizeRoles("ADMIN"), updateUserByAdmin);
router.patch("/users/:id", authorizeRoles("ADMIN"), updateUserByAdmin);
router.patch("/users/:id/suspend", authorizeRoles("ADMIN"), setUserStatus("SUSPENDED"));
router.patch("/users/:id/activate", authorizeRoles("ADMIN"), setUserStatus("ACTIVE"));
router.patch("/users/:id/ban", authorizeRoles("ADMIN"), setUserStatus("BANNED"));
router.delete("/users/:id", authorizeRoles("ADMIN"), deleteUser);

router.get("/organizations", authorizeRoles("ADMIN", "AGENT"), adminListOrganizations);
router.post("/organizations", authorizeRoles("ADMIN"), createOrganization);
router.put("/organizations/:id", authorizeRoles("ADMIN"), updateOrganization);
router.patch("/organizations/:id/activate", authorizeRoles("ADMIN"), setOrganizationStatus("ACTIVE"));
router.patch("/organizations/:id/deactivate", authorizeRoles("ADMIN"), setOrganizationStatus("INACTIVE"));
router.post("/organizations/:id/users", authorizeRoles("ADMIN"), addOrganizationUser);
router.delete("/organizations/:id/users/:userId", authorizeRoles("ADMIN"), removeOrganizationUser);

router.get("/missions", authorizeRoles("ADMIN", "AGENT"), adminListMissions);
router.get("/missions/:id", authorizeRoles("ADMIN", "AGENT"), adminGetMission);
router.post("/missions", authorizeRoles("ADMIN", "AGENT"), adminCreateMission);
router.put("/missions/:id", authorizeRoles("ADMIN", "AGENT"), adminUpdateMission);
router.patch("/missions/:id/publish", authorizeRoles("ADMIN", "AGENT"), setMissionStatus("PUBLISHED"));
router.patch("/missions/:id/start", authorizeRoles("ADMIN", "AGENT"), setMissionStatus("IN_PROGRESS"));
router.patch("/missions/:id/complete", authorizeRoles("ADMIN", "AGENT"), setMissionStatus("COMPLETED"));
router.patch("/missions/:id/cancel", authorizeRoles("ADMIN", "AGENT"), setMissionStatus("CANCELLED"));
router.delete("/missions/:id", authorizeRoles("ADMIN"), deleteMission);

router.get("/evidences", authorizeRoles("ADMIN", "AGENT"), listEvidences);
router.patch("/evidences/:id/approve", authorizeRoles("ADMIN", "AGENT"), reviewEvidence("APPROVED"));
router.patch("/evidences/:id/reject", authorizeRoles("ADMIN", "AGENT"), reviewEvidence("REJECTED"));

router.post("/points/adjust", authorizeRoles("ADMIN"), adjustPoints);
router.get("/points/transactions", authorizeRoles("ADMIN"), adminPointTransactions);

router.post("/rewards", authorizeRoles("ADMIN"), adminCreateReward);
router.get("/rewards", authorizeRoles("ADMIN", "AGENT"), adminListRewards);
router.put("/rewards/:id", authorizeRoles("ADMIN"), adminUpdateReward);
router.patch("/rewards/:id/activate", authorizeRoles("ADMIN"), setRewardStatus("ACTIVE"));
router.patch("/rewards/:id/deactivate", authorizeRoles("ADMIN"), setRewardStatus("INACTIVE"));
router.get("/redemptions", authorizeRoles("ADMIN", "AGENT"), adminRedemptions);
router.patch("/redemptions/:id/approve", authorizeRoles("ADMIN"), setRedemptionStatus("APPROVED"));
router.patch("/redemptions/:id/deliver", authorizeRoles("ADMIN"), setRedemptionStatus("DELIVERED"));
router.patch("/redemptions/:id/cancel", authorizeRoles("ADMIN"), setRedemptionStatus("CANCELLED"));

router.post("/recycling/centers", authorizeRoles("ADMIN"), createCenter);
router.put("/recycling/centers/:id", authorizeRoles("ADMIN"), updateCenter);
router.patch("/recycling/centers/:id/activate", authorizeRoles("ADMIN"), setCenterStatus("ACTIVE"));
router.patch("/recycling/centers/:id/deactivate", authorizeRoles("ADMIN"), setCenterStatus("INACTIVE"));
router.post("/recycling/logs", authorizeRoles("ADMIN", "AGENT", "AUDITOR"), createRecyclingLog);
router.get("/recycling/logs", authorizeRoles("ADMIN", "AGENT"), listRecyclingLogs);

router.post("/notifications/user", authorizeRoles("ADMIN"), sendUserNotification);
router.post("/notifications/global", authorizeRoles("ADMIN"), sendGlobalNotification);

export default router;
