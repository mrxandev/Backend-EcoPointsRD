import bcrypt from "bcryptjs";
import { pool } from "../db/connection.js";
import { appendFilter, buildSetClause, pagination } from "../utils/db.js";
import { fail, ok } from "../utils/response.js";
import { createSystemLog } from "../utils/systemLog.js";

const allowedRoles = ["USER", "AGENT", "AUDITOR", "ADMIN"];
const allowedStatuses = ["ACTIVE", "SUSPENDED", "BANNED"];
const userFields = `
  id, cedula, first_name, last_name, email, phone, role, status, is_verified,
  province, municipality, address, profile_image, points, total_points_earned,
  total_points_redeemed, completed_missions, created_at, updated_at
`;

export const createUserByAdmin = async (req, res) => {
  let { cedula, first_name, last_name, email, password, phone, role, province, municipality } = req.body;

  if (!cedula || !first_name || !last_name || !email || !password) {
    return fail(res, "Cedula, nombre, apellido, email y password son requeridos", 400);
  }

  role = role || "USER";
  if (!allowedRoles.includes(role)) return fail(res, "Rol no permitido", 400);
  cedula = String(cedula).replace(/\D/g, "");
  email = email.toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      `INSERT INTO users (cedula, first_name, last_name, email, password, phone, role, province, municipality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${userFields}`,
      [cedula, first_name, last_name, email, hashedPassword, phone || null, role, province || null, municipality || null]
    );

    await createSystemLog({
      actorId: req.user.id,
      targetUserId: result.rows[0].id,
      action: "ADMIN_USER_CREATED",
      entityType: "users",
      entityId: result.rows[0].id,
      newValues: result.rows[0],
      req,
    });

    return ok(res, "Usuario creado correctamente", { user: result.rows[0] }, 201);
  } catch (error) {
    if (error.code === "23505") return fail(res, "El email o la cedula ya estan registrados", 409);
    throw error;
  }
};

export const getUsers = async (req, res) => {
  const { page, limit, offset } = pagination(req.query);
  const conditions = [];
  const values = [];
  appendFilter(conditions, values, "role", req.query.role);
  appendFilter(conditions, values, "status", req.query.status);
  if (req.query.search) {
    values.push(`%${req.query.search}%`);
    conditions.push(`(email ILIKE $${values.length} OR cedula ILIKE $${values.length} OR first_name ILIKE $${values.length} OR last_name ILIKE $${values.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  values.push(limit, offset);
  const result = await pool.query(
    `SELECT ${userFields} FROM users ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return ok(res, "Usuarios obtenidos correctamente", { users: result.rows, page, limit });
};

export const getUserDetail = async (req, res) => {
  const result = await pool.query(`SELECT ${userFields} FROM users WHERE id = $1`, [req.params.id]);
  if (result.rows.length === 0) return fail(res, "Usuario no encontrado", 404);
  return ok(res, "Usuario obtenido correctamente", { user: result.rows[0] });
};

export const updateUserByAdmin = async (req, res) => {
  const allowed = ["first_name", "last_name", "phone", "role", "status", "province", "municipality", "profile_image", "address"];
  if (req.body.role && !allowedRoles.includes(req.body.role)) return fail(res, "Rol no permitido", 400);
  if (req.body.status && !allowedStatuses.includes(req.body.status)) return fail(res, "Estado no permitido", 400);
  const { values, setClause } = buildSetClause(req.body, allowed);
  if (!setClause) return fail(res, "No hay campos validos para actualizar", 400);
  values.push(req.params.id);
  const result = await pool.query(
    `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING ${userFields}`,
    values
  );
  if (result.rows.length === 0) return fail(res, "Usuario no encontrado", 404);
  return ok(res, "Usuario actualizado correctamente", { user: result.rows[0] });
};

export const setUserStatus = (status) => async (req, res) => {
  const result = await pool.query(
    `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING ${userFields}`,
    [status, req.params.id]
  );
  if (result.rows.length === 0) return fail(res, "Usuario no encontrado", 404);
  await createSystemLog({
    actorId: req.user.id,
    targetUserId: req.params.id,
    action: "USER_STATUS_UPDATED",
    entityType: "users",
    entityId: req.params.id,
    newValues: { status },
    req,
  });
  return ok(res, "Estado de usuario actualizado", { user: result.rows[0] });
};

export const deleteUser = setUserStatus("BANNED");

export const getAuditLogs = async (req, res) => {
  const conditions = [];
  const values = [];
  appendFilter(conditions, values, "actor_id", req.query.user_id || req.query.actorId);
  appendFilter(conditions, values, "target_user_id", req.query.targetUserId);
  appendFilter(conditions, values, "action", req.query.action);
  appendFilter(conditions, values, "entity_type", req.query.entity_type || req.query.entityType);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(`SELECT * FROM system_logs ${where} ORDER BY created_at DESC`, values);
  return ok(res, "Logs obtenidos correctamente", { logs: result.rows });
};

export const getAuditLogDetail = async (req, res) => {
  const result = await pool.query("SELECT * FROM system_logs WHERE id = $1", [req.params.id]);
  if (result.rows.length === 0) return fail(res, "Log no encontrado", 404);
  return ok(res, "Log obtenido correctamente", { log: result.rows[0] });
};
