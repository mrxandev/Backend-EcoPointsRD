import { pool } from "../db/connection.js";
import { fail, ok } from "../utils/response.js";

export const myNotifications = async (req, res) => {
  const result = await pool.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC", [
    req.user.id,
  ]);
  return ok(res, "Notificaciones obtenidas correctamente", { notifications: result.rows });
};

export const markRead = async (req, res) => {
  const result = await pool.query(
    "UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *",
    [req.params.id, req.user.id]
  );
  if (result.rows.length === 0) return fail(res, "Notificacion no encontrada", 404);
  return ok(res, "Notificacion marcada como leida", { notification: result.rows[0] });
};

export const markAllRead = async (req, res) => {
  await pool.query("UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL", [req.user.id]);
  return ok(res, "Notificaciones marcadas como leidas");
};

export const sendUserNotification = async (req, res) => {
  const { user_id, title, message, type } = req.body;
  if (!user_id || !title || !message) return fail(res, "user_id, title y message son requeridos", 400);
  const result = await pool.query(
    "INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4) RETURNING *",
    [user_id, title, message, type || "SYSTEM"]
  );
  return ok(res, "Notificacion enviada", { notification: result.rows[0] }, 201);
};

export const sendGlobalNotification = async (req, res) => {
  const { title, message, type } = req.body;
  if (!title || !message) return fail(res, "title y message son requeridos", 400);
  const result = await pool.query(
    `INSERT INTO notifications (user_id, title, message, type)
     SELECT id, $1, $2, $3 FROM users WHERE status = 'ACTIVE'
     RETURNING id`,
    [title, message, type || "SYSTEM"]
  );
  return ok(res, "Notificacion global enviada", { created: result.rowCount }, 201);
};
