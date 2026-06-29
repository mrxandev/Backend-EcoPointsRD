import { pool } from "../db/connection.js";
import { fail, ok } from "../utils/response.js";

const userFields = `
  id, cedula, first_name, last_name, email, phone, role, status, is_verified,
  province, municipality, address, profile_image, points, total_points_earned,
  total_points_redeemed, completed_missions, created_at, updated_at
`;

export const getMe = async (req, res) => {
  const result = await pool.query(`SELECT ${userFields} FROM users WHERE id = $1`, [req.user.id]);
  return ok(res, "Perfil obtenido correctamente", { user: result.rows[0] });
};

export const updateMe = async (req, res) => {
  const allowed = ["first_name", "last_name", "phone", "province", "municipality", "address", "profile_image"];
  const updates = allowed.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field));

  if (updates.length === 0) {
    return fail(res, "No hay campos validos para actualizar", 400);
  }

  const values = updates.map((field) => req.body[field]);
  values.push(req.user.id);

  const setClause = updates.map((field, index) => `${field} = $${index + 1}`).join(", ");
  const result = await pool.query(
    `UPDATE users SET ${setClause}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING ${userFields}`,
    values
  );

  return ok(res, "Perfil actualizado correctamente", { user: result.rows[0] });
};

export const getMyPoints = async (req, res) => {
  const result = await pool.query(
    `SELECT points, total_points_earned, total_points_redeemed
     FROM users WHERE id = $1`,
    [req.user.id]
  );

  return ok(res, "Puntos obtenidos correctamente", result.rows[0]);
};

export const getMyTransactions = async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM point_transactions
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [req.user.id]
  );

  return ok(res, "Historial obtenido correctamente", { transactions: result.rows });
};
