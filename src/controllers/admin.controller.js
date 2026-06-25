import bcrypt from "bcryptjs";
import { pool } from "../db/connection.js";
import { createAuditLog } from "../utils/auditLogger.js";

const allowedRoles = ["USER", "AGENT", "ADMIN"];
const allowedStatuses = ["ACTIVE", "SUSPENDED", "BANNED"];

const userFields = `
  id,
  cedula,
  first_name,
  last_name,
  email,
  phone,
  role,
  status,
  is_verified,
  email_verified_at,
  profile_image,
  country,
  province,
  municipality,
  points,
  total_points_earned,
  total_points_redeemed,
  completed_missions,
  created_at,
  updated_at
`;

const getRequestInfo = (req) => ({
  ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
  userAgent: req.headers["user-agent"] || null,
});

const getUserById = async (id) => {
  const result = await pool.query(
    `SELECT ${userFields}
     FROM users
     WHERE id = $1`,
    [id]
  );

  return result.rows[0];
};

export const createUserByAdmin = async (req, res) => {
  try {
    let {
      cedula,
      first_name,
      last_name,
      email,
      password,
      phone,
      role,
      status,
      province,
      municipality,
    } = req.body;

    if (!cedula || !first_name || !last_name || !email || !password) {
      return res.status(400).json({
        message: "Cedula, nombre, apellido, email y password son requeridos",
      });
    }

    role = role || "USER";
    status = status || "ACTIVE";

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Rol no permitido",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Estado no permitido",
      });
    }

    cedula = cedula.replace(/\D/g, "");
    email = email.toLowerCase();

    if (!/^\d{11}$/.test(cedula)) {
      return res.status(400).json({
        message: "La cedula debe tener 11 digitos",
      });
    }

    const userExists = await pool.query(
      `SELECT id FROM users
       WHERE email = $1 OR cedula = $2`,
      [email, cedula]
    );

    if (userExists.rows.length > 0) {
      return res.status(409).json({
        message: "El email o la cedula ya estan registrados",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (
        cedula,
        first_name,
        last_name,
        email,
        password,
        phone,
        role,
        status,
        province,
        municipality
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING ${userFields}`,
      [
        cedula,
        first_name,
        last_name,
        email,
        hashedPassword,
        phone || null,
        role,
        status,
        province || null,
        municipality || null,
      ]
    );

    const user = result.rows[0];

    await createAuditLog({
      actorId: req.user.id,
      targetUserId: user.id,
      action: "ADMIN_USER_CREATED",
      entityType: "users",
      entityId: user.id,
      oldValues: null,
      newValues: user,
      ...getRequestInfo(req),
    });

    return res.status(201).json({
      message: "Usuario creado correctamente",
      user,
    });
  } catch (error) {
    console.error("Error en createUserByAdmin:", error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const conditions = [];
    const values = [];

    if (role) {
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          message: "Rol no permitido",
        });
      }

      values.push(role);
      conditions.push(`role = $${values.length}`);
    }

    if (status) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Estado no permitido",
        });
      }

      values.push(status);
      conditions.push(`status = $${values.length}`);
    }

    if (search) {
      values.push(`%${search.toLowerCase()}%`);
      conditions.push(`(
        cedula ILIKE $${values.length}
        OR email ILIKE $${values.length}
        OR first_name ILIKE $${values.length}
        OR last_name ILIKE $${values.length}
      )`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT ${userFields}
       FROM users
       ${where}
       ORDER BY created_at DESC`,
      values
    );

    return res.json({
      message: "Usuarios obtenidos correctamente",
      users: result.rows,
    });
  } catch (error) {
    console.error("Error en getUsers:", error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

export const getUserDetail = async (req, res) => {
  try {
    const user = await getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    return res.json({
      user,
    });
  } catch (error) {
    console.error("Error en getUserDetail:", error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

export const updateUserByAdmin = async (req, res) => {
  try {
    const allowedFields = [
      "first_name",
      "last_name",
      "phone",
      "email",
      "cedula",
      "is_verified",
      "province",
      "municipality",
      "profile_image",
    ];

    const user = await getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    const updates = {};

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No hay campos validos para actualizar",
      });
    }

    if (updates.cedula) {
      updates.cedula = updates.cedula.replace(/\D/g, "");

      if (!/^\d{11}$/.test(updates.cedula)) {
        return res.status(400).json({
          message: "La cedula debe tener 11 digitos",
        });
      }
    }

    if (updates.email) {
      updates.email = updates.email.toLowerCase();
    }

    if (updates.email || updates.cedula) {
      const duplicate = await pool.query(
        `SELECT id FROM users
         WHERE id <> $1
         AND (email = $2 OR cedula = $3)`,
        [req.params.id, updates.email || user.email, updates.cedula || user.cedula]
      );

      if (duplicate.rows.length > 0) {
        return res.status(409).json({
          message: "El email o la cedula ya estan registrados",
        });
      }
    }

    const fields = Object.keys(updates);
    const values = fields.map((field) => updates[field]);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");

    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE users
       SET ${setClause}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING ${userFields}`,
      values
    );

    const updatedUser = result.rows[0];
    const oldValues = {};
    const newValues = {};

    fields.forEach((field) => {
      oldValues[field] = user[field];
      newValues[field] = updatedUser[field];
    });

    await createAuditLog({
      actorId: req.user.id,
      targetUserId: updatedUser.id,
      action: "USER_PROFILE_UPDATED_BY_ADMIN",
      entityType: "users",
      entityId: updatedUser.id,
      oldValues,
      newValues,
      ...getRequestInfo(req),
    });

    return res.json({
      message: "Usuario actualizado correctamente",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error en updateUserByAdmin:", error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role, reason } = req.body;

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Rol no permitido",
      });
    }

    const user = await getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING ${userFields}`,
      [role, req.params.id]
    );

    const updatedUser = result.rows[0];

    await createAuditLog({
      actorId: req.user.id,
      targetUserId: updatedUser.id,
      action: "USER_ROLE_UPDATED",
      entityType: "users",
      entityId: updatedUser.id,
      oldValues: { role: user.role },
      newValues: { role: updatedUser.role },
      reason,
      ...getRequestInfo(req),
    });

    return res.json({
      message: "Rol actualizado correctamente",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error en updateUserRole:", error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Estado no permitido",
      });
    }

    const user = await getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING ${userFields}`,
      [status, req.params.id]
    );

    const updatedUser = result.rows[0];

    await createAuditLog({
      actorId: req.user.id,
      targetUserId: updatedUser.id,
      action: "USER_STATUS_UPDATED",
      entityType: "users",
      entityId: updatedUser.id,
      oldValues: { status: user.status },
      newValues: { status: updatedUser.status },
      reason,
      ...getRequestInfo(req),
    });

    return res.json({
      message: "Estado actualizado correctamente",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error en updateUserStatus:", error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

export const getDashboard = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active_users,
        COUNT(*) FILTER (WHERE status = 'SUSPENDED')::int AS suspended_users,
        COUNT(*) FILTER (WHERE status = 'BANNED')::int AS banned_users,
        COUNT(*) FILTER (WHERE role = 'AGENT')::int AS total_agents,
        COUNT(*) FILTER (WHERE role = 'ADMIN')::int AS total_admins,
        COUNT(*) FILTER (WHERE is_verified = true)::int AS verified_users
      FROM users`
    );

    const stats = result.rows[0];

    return res.json({
      totalUsers: stats.total_users,
      activeUsers: stats.active_users,
      suspendedUsers: stats.suspended_users,
      bannedUsers: stats.banned_users,
      totalAgents: stats.total_agents,
      totalAdmins: stats.total_admins,
      verifiedUsers: stats.verified_users,
    });
  } catch (error) {
    console.error("Error en getDashboard:", error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const { action, entityType, actorId, targetUserId } = req.query;
    const conditions = [];
    const values = [];

    if (action) {
      values.push(action);
      conditions.push(`action = $${values.length}`);
    }

    if (entityType) {
      values.push(entityType);
      conditions.push(`entity_type = $${values.length}`);
    }

    if (actorId) {
      values.push(actorId);
      conditions.push(`actor_id = $${values.length}`);
    }

    if (targetUserId) {
      values.push(targetUserId);
      conditions.push(`target_user_id = $${values.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT *
       FROM audit_logs
       ${where}
       ORDER BY created_at DESC`,
      values
    );

    return res.json({
      message: "Auditorias obtenidas correctamente",
      auditLogs: result.rows,
    });
  } catch (error) {
    console.error("Error en getAuditLogs:", error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

export const getAuditLogDetail = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM audit_logs
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Auditoria no encontrada",
      });
    }

    return res.json({
      auditLog: result.rows[0],
    });
  } catch (error) {
    console.error("Error en getAuditLogDetail:", error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};
