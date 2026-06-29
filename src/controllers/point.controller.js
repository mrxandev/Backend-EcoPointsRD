import { pool } from "../db/connection.js";
import { appendFilter, pagination } from "../utils/db.js";
import { fail, ok } from "../utils/response.js";
import { createSystemLog } from "../utils/systemLog.js";

export const getBalance = async (req, res) => {
  const result = await pool.query(
    "SELECT points, total_points_earned, total_points_redeemed FROM users WHERE id = $1",
    [req.user.id]
  );

  return ok(res, "Balance obtenido correctamente", result.rows[0]);
};

export const getTransactions = async (req, res) => {
  const { page, limit, offset } = pagination(req.query);
  const values = [req.user.id];
  const conditions = ["user_id = $1"];
  appendFilter(conditions, values, "transaction_type", req.query.type);
  values.push(limit, offset);

  const result = await pool.query(
    `SELECT * FROM point_transactions
     WHERE ${conditions.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return ok(res, "Transacciones obtenidas correctamente", { transactions: result.rows, page, limit });
};

export const getRanking = async (req, res) => {
  const values = [];
  const conditions = ["status = 'ACTIVE'"];
  appendFilter(conditions, values, "province", req.query.province);
  values.push(Number(req.query.limit || 50));

  const result = await pool.query(
    `SELECT id, first_name, last_name, province, municipality, points
     FROM users
     WHERE ${conditions.join(" AND ")}
     ORDER BY points DESC, created_at ASC
     LIMIT $${values.length}`,
    values
  );

  return ok(res, "Ranking obtenido correctamente", { ranking: result.rows });
};

export const adjustPoints = async (req, res) => {
  const { user_id, points, transaction_type, description } = req.body;
  const amount = Number(points || 0);

  if (!user_id || amount <= 0 || !["BONUS", "PENALTY"].includes(transaction_type)) {
    return fail(res, "user_id, points positivos y transaction_type BONUS/PENALTY son requeridos", 400);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const userResult = await client.query("SELECT points FROM users WHERE id = $1 FOR UPDATE", [user_id]);

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return fail(res, "Usuario no encontrado", 404);
    }

    const delta = transaction_type === "BONUS" ? amount : -amount;
    const nextPoints = userResult.rows[0].points + delta;

    if (nextPoints < 0) {
      await client.query("ROLLBACK");
      return fail(res, "El usuario no puede quedar con puntos negativos", 400);
    }

    await client.query(
      `UPDATE users
       SET points = points + $1,
           total_points_earned = total_points_earned + CASE WHEN $1 > 0 THEN $1 ELSE 0 END,
           total_points_redeemed = total_points_redeemed + CASE WHEN $1 < 0 THEN ABS($1) ELSE 0 END,
           updated_at = NOW()
       WHERE id = $2`,
      [delta, user_id]
    );

    const tx = await client.query(
      `INSERT INTO point_transactions (user_id, points, transaction_type, description, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, Math.abs(delta), transaction_type, description || "Ajuste manual", req.user.id]
    );

    await createSystemLog({
      client,
      actorId: req.user.id,
      targetUserId: user_id,
      action: "POINTS_ADJUSTED",
      entityType: "point_transactions",
      entityId: tx.rows[0].id,
      newValues: tx.rows[0],
      req,
    });

    await client.query("COMMIT");
    return ok(res, "Puntos ajustados correctamente", { transaction: tx.rows[0] }, 201);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const adminPointTransactions = async (req, res) => {
  const conditions = [];
  const values = [];
  appendFilter(conditions, values, "user_id", req.query.user_id);
  appendFilter(conditions, values, "transaction_type", req.query.type);
  appendFilter(conditions, values, "created_at", req.query.from, ">=");
  appendFilter(conditions, values, "created_at", req.query.to, "<=");

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(`SELECT * FROM point_transactions ${where} ORDER BY created_at DESC`, values);

  return ok(res, "Transacciones obtenidas correctamente", { transactions: result.rows });
};
