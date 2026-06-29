import { pool } from "../db/connection.js";
import { ok } from "../utils/response.js";

export const summary = async (req, res) => {
  const result = await pool.query(
    `SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      (SELECT COUNT(*)::int FROM users WHERE status = 'ACTIVE') AS active_users,
      (SELECT COUNT(*)::int FROM missions) AS total_missions,
      (SELECT COUNT(*)::int FROM missions WHERE status = 'PUBLISHED') AS published_missions,
      (SELECT COUNT(*)::int FROM missions WHERE status = 'COMPLETED') AS completed_missions,
      (SELECT COALESCE(SUM(points), 0)::int FROM point_transactions WHERE transaction_type IN ('EARNED', 'BONUS')) AS total_points_generated,
      (SELECT COUNT(*)::int FROM reward_redemptions) AS total_rewards_redeemed,
      (SELECT COUNT(*)::int FROM mission_evidences WHERE status = 'PENDING') AS pending_evidences`
  );
  return ok(res, "Resumen obtenido correctamente", result.rows[0]);
};

export const userStats = async (req, res) => {
  const [byRole, byStatus, byMonth] = await Promise.all([
    pool.query("SELECT role, COUNT(*)::int AS total FROM users GROUP BY role"),
    pool.query("SELECT status, COUNT(*)::int AS total FROM users GROUP BY status"),
    pool.query("SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*)::int AS total FROM users GROUP BY month ORDER BY month"),
  ]);
  return ok(res, "Estadisticas de usuarios obtenidas", {
    byRole: byRole.rows,
    byStatus: byStatus.rows,
    registeredByMonth: byMonth.rows,
  });
};

export const missionStats = async (req, res) => {
  const [byType, byStatus, popular, points] = await Promise.all([
    pool.query("SELECT mission_type, COUNT(*)::int AS total FROM missions GROUP BY mission_type"),
    pool.query("SELECT status, COUNT(*)::int AS total FROM missions GROUP BY status"),
    pool.query(`SELECT m.id, m.title, COUNT(mr.id)::int AS registrations FROM missions m LEFT JOIN mission_registrations mr ON mr.mission_id = m.id GROUP BY m.id ORDER BY registrations DESC LIMIT 10`),
    pool.query(`SELECT m.id, m.title, COALESCE(SUM(pt.points), 0)::int AS points FROM missions m LEFT JOIN point_transactions pt ON pt.mission_id = m.id GROUP BY m.id ORDER BY points DESC LIMIT 10`),
  ]);
  return ok(res, "Estadisticas de misiones obtenidas", {
    byType: byType.rows,
    byStatus: byStatus.rows,
    mostPopular: popular.rows,
    mostPointsAwarded: points.rows,
  });
};

export const pointStats = async (req, res) => {
  const [totals, topUsers, recent] = await Promise.all([
    pool.query(`SELECT
      COALESCE(SUM(points) FILTER (WHERE transaction_type IN ('EARNED', 'BONUS')), 0)::int AS delivered,
      COALESCE(SUM(points) FILTER (WHERE transaction_type IN ('REDEEMED', 'PENALTY')), 0)::int AS redeemed
      FROM point_transactions`),
    pool.query("SELECT id, first_name, last_name, points FROM users ORDER BY points DESC LIMIT 10"),
    pool.query("SELECT * FROM point_transactions ORDER BY created_at DESC LIMIT 20"),
  ]);
  return ok(res, "Estadisticas de puntos obtenidas", {
    totals: totals.rows[0],
    topUsers: topUsers.rows,
    recentTransactions: recent.rows,
  });
};

export const rewardStats = async (req, res) => {
  const [most, empty, pending, delivered] = await Promise.all([
    pool.query(`SELECT r.id, r.title, COUNT(rr.id)::int AS redemptions FROM rewards r LEFT JOIN reward_redemptions rr ON rr.reward_id = r.id GROUP BY r.id ORDER BY redemptions DESC LIMIT 10`),
    pool.query("SELECT * FROM rewards WHERE stock = 0"),
    pool.query("SELECT COUNT(*)::int AS total FROM reward_redemptions WHERE status = 'PENDING'"),
    pool.query("SELECT COUNT(*)::int AS total FROM reward_redemptions WHERE status = 'DELIVERED'"),
  ]);
  return ok(res, "Estadisticas de recompensas obtenidas", {
    mostRedeemed: most.rows,
    outOfStock: empty.rows,
    pendingRedemptions: pending.rows[0].total,
    deliveredRedemptions: delivered.rows[0].total,
  });
};
