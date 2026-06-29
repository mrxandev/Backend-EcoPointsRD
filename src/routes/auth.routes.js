import { Router } from "express";
import { changePassword, getProfile, login, register } from "../controllers/auth.controller.js";
import { authMiddleware, authorizeRoles } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar usuario
 *     description: Crea un usuario normal con rol USER.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Usuario registrado correctamente
 *       400:
 *         description: Datos invalidos
 *       409:
 *         description: Email o cedula duplicados
 *       500:
 *         description: Error interno
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesion
 *     description: Inicia sesion con email o cedula y devuelve JWT.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login correcto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Datos requeridos faltantes
 *       401:
 *         description: Credenciales invalidas
 *       403:
 *         description: Cuenta inactiva
 *       500:
 *         description: Error interno
 * /api/auth/me:
 *   get:
 *     summary: Perfil autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido correctamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Error interno
 * /api/auth/profile:
 *   get:
 *     summary: Perfil autenticado alias
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido correctamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * /api/auth/change-password:
 *   put:
 *     summary: Cambiar contrasena
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current_password, new_password]
 *             properties:
 *               current_password:
 *                 type: string
 *                 example: "12345678"
 *               new_password:
 *                 type: string
 *                 example: "87654321"
 *     responses:
 *       200:
 *         description: Contrasena actualizada
 *       400:
 *         description: Datos invalidos
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getProfile);
router.get("/profile", authMiddleware, getProfile);
router.put("/change-password", authMiddleware, changePassword);

router.get("/admin/test", authMiddleware, authorizeRoles("ADMIN"), (req, res) => {
  res.json({ success: true, message: "Acceso permitido solo para ADMIN", data: { user: req.user } });
});

router.get("/validator/test", authMiddleware, authorizeRoles("AUDITOR", "AGENT", "ADMIN"), (req, res) => {
  res.json({ success: true, message: "Acceso permitido para auditor, agent o admin", data: { user: req.user } });
});

export default router;
