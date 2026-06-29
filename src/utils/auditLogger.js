import { pool } from "../db/connection.js";

export const createAuditLog = async ({
  actorId,
  targetUserId,
  action,
  entityType,
  entityId,
  oldValues = null,
  newValues = null,
  reason = null,
  ipAddress = null,
  userAgent = null,
}) => {
  const result = await pool.query(
    `INSERT INTO system_logs (
      actor_id,
      target_user_id,
      action,
      entity_type,
      entity_id,
      old_values,
      new_values,
      reason,
      ip_address,
      user_agent
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      actorId || null,
      targetUserId || null,
      action,
      entityType,
      entityId || null,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      reason || null,
      ipAddress || null,
      userAgent || null,
    ]
  );

  return result.rows[0];
};
