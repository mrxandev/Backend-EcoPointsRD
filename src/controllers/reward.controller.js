import { pool } from "../db/connection.js";
import { buildSetClause } from "../utils/db.js";
import { fail, ok } from "../utils/response.js";

export const listRewards = async (req, res) => {
  const result = await pool.query("SELECT * FROM rewards WHERE status = 'ACTIVE' ORDER BY created_at DESC");
  return ok(res, "Recompensas obtenidas correctamente", { rewards: result.rows });
};

export const getReward = async (req, res) => {
  const result = await pool.query("SELECT * FROM rewards WHERE id = $1", [req.params.id]);
  if (result.rows.length === 0) return fail(res, "Recompensa no encontrada", 404);
  return ok(res, "Recompensa obtenida correctamente", { reward: result.rows[0] });
};

export const redeemReward = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const rewardResult = await client.query("SELECT * FROM rewards WHERE id = $1 FOR UPDATE", [req.params.id]);
    if (rewardResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return fail(res, "Recompensa no encontrada", 404);
    }

    const reward = rewardResult.rows[0];
    if (reward.status !== "ACTIVE" || reward.stock <= 0) {
      await client.query("ROLLBACK");
      return fail(res, "Recompensa no disponible", 400);
    }

    const userResult = await client.query("SELECT points FROM users WHERE id = $1 FOR UPDATE", [req.user.id]);
    if (userResult.rows[0].points < reward.points_required) {
      await client.query("ROLLBACK");
      return fail(res, "Puntos insuficientes", 400);
    }

    await client.query(
      `UPDATE users
       SET points = points - $1,
           total_points_redeemed = total_points_redeemed + $1,
           updated_at = NOW()
       WHERE id = $2`,
      [reward.points_required, req.user.id]
    );
    await client.query("UPDATE rewards SET stock = stock - 1, updated_at = NOW() WHERE id = $1", [reward.id]);
    const redemption = await client.query(
      `INSERT INTO reward_redemptions (reward_id, user_id, points_spent)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [reward.id, req.user.id, reward.points_required]
    );
    await client.query(
      `INSERT INTO point_transactions (user_id, points, transaction_type, description, reward_id, redemption_id)
       VALUES ($1, $2, 'REDEEMED', $3, $4, $5)`,
      [req.user.id, reward.points_required, `Canje de recompensa: ${reward.title}`, reward.id, redemption.rows[0].id]
    );
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Recompensa canjeada', $2, 'REWARD')`,
      [req.user.id, `Canjeaste ${reward.title}`]
    );

    await client.query("COMMIT");
    return ok(res, "Recompensa canjeada correctamente", { redemption: redemption.rows[0] }, 201);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const myRedemptions = async (req, res) => {
  const result = await pool.query(
    `SELECT rr.*, r.title, r.image_url
     FROM reward_redemptions rr
     JOIN rewards r ON r.id = rr.reward_id
     WHERE rr.user_id = $1
     ORDER BY rr.created_at DESC`,
    [req.user.id]
  );
  return ok(res, "Canjes obtenidos correctamente", { redemptions: result.rows });
};

export const adminCreateReward = async (req, res) => {
  const { title, description, points_required, stock, image_url, sponsor_id } = req.body;
  if (!title || points_required === undefined) return fail(res, "title y points_required son requeridos", 400);
  const result = await pool.query(
    `INSERT INTO rewards (title, description, points_required, stock, image_url, sponsor_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [title, description || null, points_required, stock || 0, image_url || null, sponsor_id || null, req.user.id]
  );
  return ok(res, "Recompensa creada correctamente", { reward: result.rows[0] }, 201);
};

export const adminListRewards = async (req, res) => {
  const result = await pool.query("SELECT * FROM rewards ORDER BY created_at DESC");
  return ok(res, "Recompensas admin obtenidas correctamente", { rewards: result.rows });
};

export const adminUpdateReward = async (req, res) => {
  const allowed = ["title", "description", "points_required", "stock", "image_url", "sponsor_id"];
  const { values, setClause } = buildSetClause(req.body, allowed);
  if (!setClause) return fail(res, "No hay campos validos para actualizar", 400);
  values.push(req.params.id);
  const result = await pool.query(
    `UPDATE rewards SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values
  );
  if (result.rows.length === 0) return fail(res, "Recompensa no encontrada", 404);
  return ok(res, "Recompensa actualizada correctamente", { reward: result.rows[0] });
};

export const setRewardStatus = (status) => async (req, res) => {
  const result = await pool.query("UPDATE rewards SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [
    status,
    req.params.id,
  ]);
  if (result.rows.length === 0) return fail(res, "Recompensa no encontrada", 404);
  return ok(res, "Estado de recompensa actualizado", { reward: result.rows[0] });
};

export const adminRedemptions = async (req, res) => {
  const result = await pool.query("SELECT * FROM reward_redemptions ORDER BY created_at DESC");
  return ok(res, "Canjes obtenidos correctamente", { redemptions: result.rows });
};

export const setRedemptionStatus = (status) => async (req, res) => {
  const result = await pool.query(
    "UPDATE reward_redemptions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [status, req.params.id]
  );
  if (result.rows.length === 0) return fail(res, "Canje no encontrado", 404);
  return ok(res, "Estado de canje actualizado", { redemption: result.rows[0] });
};
