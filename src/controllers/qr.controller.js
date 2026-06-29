import crypto from "crypto";
import { pool } from "../db/connection.js";
import { fail, ok } from "../utils/response.js";

export const generateQr = async (req, res) => {
  const token = crypto.randomBytes(32).toString("hex");
  const result = await pool.query(
    `INSERT INTO qr_sessions (user_id, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
     RETURNING id AS qr_session_id, token, expires_at`,
    [req.user.id, token]
  );

  return ok(res, "QR generado correctamente", result.rows[0], 201);
};

export const validateQr = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return fail(res, "token es requerido", 400);
  }

  const result = await pool.query(
    `SELECT qs.*, u.id AS user_id, u.first_name, u.last_name, u.email, u.status
     FROM qr_sessions qs
     JOIN users u ON u.id = qs.user_id
     WHERE qs.token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    return fail(res, "QR no encontrado", 404);
  }

  const qr = result.rows[0];

  if (qr.status !== "ACTIVE") {
    return fail(res, "El usuario del QR no esta activo", 403);
  }

  if (qr.used_at) {
    return fail(res, "QR ya utilizado", 400);
  }

  if (new Date(qr.expires_at) < new Date()) {
    return fail(res, "QR expirado", 400);
  }

  return ok(res, "QR valido", { qr });
};
