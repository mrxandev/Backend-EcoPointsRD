import { pool } from "../db/connection.js";
import { appendFilter, buildSetClause } from "../utils/db.js";
import { fail, ok } from "../utils/response.js";
import { createSystemLog } from "../utils/systemLog.js";

const missionFields = `
  title, description, mission_type, points_reward, start_date, end_date,
  province, municipality, address, latitude, longitude, max_participants,
  requires_evidence, requires_qr_validation, requires_approval, organization_id
`;

export const listMissions = async (req, res) => {
  const conditions = ["m.status IN ('PUBLISHED', 'IN_PROGRESS')"];
  const values = [];
  appendFilter(conditions, values, "m.mission_type", req.query.type);
  appendFilter(conditions, values, "m.province", req.query.province);
  appendFilter(conditions, values, "m.municipality", req.query.municipality);
  appendFilter(conditions, values, "m.status", req.query.status);

  const result = await pool.query(
    `SELECT m.*, o.name AS organization_name,
      COUNT(mr.id)::int AS registered_count
     FROM missions m
     LEFT JOIN organizations o ON o.id = m.organization_id
     LEFT JOIN mission_registrations mr ON mr.mission_id = m.id AND mr.status <> 'CANCELLED'
     WHERE ${conditions.join(" AND ")}
     GROUP BY m.id, o.name
     ORDER BY m.created_at DESC`,
    values
  );

  return ok(res, "Misiones obtenidas correctamente", { missions: result.rows });
};

export const getMission = async (req, res) => {
  const values = [req.params.id];
  const userJoin = req.user?.id ? "LEFT JOIN mission_registrations myr ON myr.mission_id = m.id AND myr.user_id = $2" : "";
  const userSelect = req.user?.id ? ", myr.status AS my_registration_status" : "";

  if (req.user?.id) values.push(req.user.id);

  const result = await pool.query(
    `SELECT m.*, o.name AS organization_name,
      COUNT(mr.id)::int AS registered_count
      ${userSelect}
     FROM missions m
     LEFT JOIN organizations o ON o.id = m.organization_id
     LEFT JOIN mission_registrations mr ON mr.mission_id = m.id AND mr.status <> 'CANCELLED'
     ${userJoin}
     WHERE m.id = $1
     GROUP BY m.id, o.name ${req.user?.id ? ", myr.status" : ""}`,
    values
  );

  if (result.rows.length === 0) {
    return fail(res, "Mision no encontrada", 404);
  }

  return ok(res, "Mision obtenida correctamente", { mission: result.rows[0] });
};

export const registerMission = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const missionResult = await client.query("SELECT * FROM missions WHERE id = $1 FOR UPDATE", [req.params.id]);

    if (missionResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return fail(res, "Mision no encontrada", 404);
    }

    const mission = missionResult.rows[0];

    if (!["PUBLISHED", "IN_PROGRESS"].includes(mission.status)) {
      await client.query("ROLLBACK");
      return fail(res, "La mision no admite inscripciones", 400);
    }

    if (mission.max_participants) {
      const count = await client.query(
        "SELECT COUNT(*)::int AS total FROM mission_registrations WHERE mission_id = $1 AND status <> 'CANCELLED'",
        [mission.id]
      );
      if (count.rows[0].total >= mission.max_participants) {
        await client.query("ROLLBACK");
        return fail(res, "La mision alcanzo el maximo de participantes", 400);
      }
    }

    const registration = await client.query(
      `INSERT INTO mission_registrations (mission_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (mission_id, user_id)
       DO UPDATE SET status = 'REGISTERED', updated_at = NOW()
       WHERE mission_registrations.status = 'CANCELLED'
       RETURNING *`,
      [mission.id, req.user.id]
    );

    if (registration.rows.length === 0) {
      await client.query("ROLLBACK");
      return fail(res, "Ya estas inscrito en esta mision", 409);
    }

    await client.query("COMMIT");
    return ok(res, "Inscripcion creada correctamente", { registration: registration.rows[0] }, 201);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const cancelRegistration = async (req, res) => {
  const result = await pool.query(
    `UPDATE mission_registrations
     SET status = 'CANCELLED', updated_at = NOW()
     WHERE mission_id = $1 AND user_id = $2
     RETURNING *`,
    [req.params.id, req.user.id]
  );

  if (result.rows.length === 0) {
    return fail(res, "Inscripcion no encontrada", 404);
  }

  return ok(res, "Inscripcion cancelada correctamente", { registration: result.rows[0] });
};

export const myRegistrations = async (req, res) => {
  const result = await pool.query(
    `SELECT mr.*, m.title, m.description, m.mission_type, m.status AS mission_status, m.points_reward
     FROM mission_registrations mr
     JOIN missions m ON m.id = mr.mission_id
     WHERE mr.user_id = $1
     ORDER BY mr.registered_at DESC`,
    [req.user.id]
  );

  return ok(res, "Mis misiones obtenidas correctamente", { registrations: result.rows });
};

export const uploadEvidence = async (req, res) => {
  const { file_url, description } = req.body;

  if (!file_url) {
    return fail(res, "file_url es requerido", 400);
  }

  const registration = await pool.query(
    `SELECT m.requires_evidence
     FROM mission_registrations mr
     JOIN missions m ON m.id = mr.mission_id
     WHERE mr.mission_id = $1 AND mr.user_id = $2 AND mr.status <> 'CANCELLED'`,
    [req.params.id, req.user.id]
  );

  if (registration.rows.length === 0) {
    return fail(res, "Debes estar inscrito en la mision", 403);
  }

  if (!registration.rows[0].requires_evidence) {
    return fail(res, "Esta mision no requiere evidencia", 400);
  }

  const result = await pool.query(
    `INSERT INTO mission_evidences (mission_id, user_id, file_url, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [req.params.id, req.user.id, file_url, description || null]
  );

  return ok(res, "Evidencia subida correctamente", { evidence: result.rows[0] }, 201);
};

export const adminCreateMission = async (req, res) => {
  const fields = missionFields.split(",").map((field) => field.trim());
  const defaults = {
    points_reward: 0,
    requires_evidence: false,
    requires_qr_validation: false,
    requires_approval: false,
  };
  const values = fields.map((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      return req.body[field];
    }

    if (Object.prototype.hasOwnProperty.call(defaults, field)) {
      return defaults[field];
    }

    return null;
  });

  if (!req.body.title || !req.body.mission_type) {
    return fail(res, "title y mission_type son requeridos", 400);
  }

  values.push(req.user.id);
  const result = await pool.query(
    `INSERT INTO missions (${fields.join(", ")}, created_by)
     VALUES (${values.map((_, index) => `$${index + 1}`).join(", ")})
     RETURNING *`,
    values
  );

  return ok(res, "Mision creada correctamente", { mission: result.rows[0] }, 201);
};

export const adminListMissions = async (req, res) => {
  const conditions = [];
  const values = [];
  appendFilter(conditions, values, "status", req.query.status);
  appendFilter(conditions, values, "mission_type", req.query.type);
  appendFilter(conditions, values, "organization_id", req.query.organization_id);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(`SELECT * FROM missions ${where} ORDER BY created_at DESC`, values);
  return ok(res, "Misiones admin obtenidas correctamente", { missions: result.rows });
};

export const adminGetMission = async (req, res) => {
  const mission = await pool.query("SELECT * FROM missions WHERE id = $1", [req.params.id]);

  if (mission.rows.length === 0) {
    return fail(res, "Mision no encontrada", 404);
  }

  const [registrations, evidences, validations] = await Promise.all([
    pool.query("SELECT * FROM mission_registrations WHERE mission_id = $1", [req.params.id]),
    pool.query("SELECT * FROM mission_evidences WHERE mission_id = $1", [req.params.id]),
    pool.query("SELECT * FROM mission_validations WHERE mission_id = $1", [req.params.id]),
  ]);

  return ok(res, "Detalle de mision obtenido", {
    mission: mission.rows[0],
    registrations: registrations.rows,
    evidences: evidences.rows,
    validations: validations.rows,
  });
};

export const adminUpdateMission = async (req, res) => {
  const allowed = missionFields.split(",").map((field) => field.trim());
  const { values, setClause } = buildSetClause(req.body, allowed);

  if (!setClause) {
    return fail(res, "No hay campos validos para actualizar", 400);
  }

  values.push(req.params.id);
  const result = await pool.query(
    `UPDATE missions SET ${setClause}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return fail(res, "Mision no encontrada", 404);
  }

  return ok(res, "Mision actualizada correctamente", { mission: result.rows[0] });
};

export const setMissionStatus = (status) => async (req, res) => {
  const result = await pool.query(
    `UPDATE missions SET status = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  );

  if (result.rows.length === 0) {
    return fail(res, "Mision no encontrada", 404);
  }

  return ok(res, "Estado de mision actualizado", { mission: result.rows[0] });
};

export const deleteMission = async (req, res) => {
  const result = await pool.query("DELETE FROM missions WHERE id = $1 RETURNING id", [req.params.id]);

  if (result.rows.length === 0) {
    return fail(res, "Mision no encontrada", 404);
  }

  return ok(res, "Mision eliminada correctamente");
};

export const validateMission = async (req, res) => {
  const { user_id, qr_token, notes } = req.body;

  if (!user_id) {
    return fail(res, "user_id es requerido", 400);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const missionResult = await client.query("SELECT * FROM missions WHERE id = $1 FOR UPDATE", [req.params.id]);

    if (missionResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return fail(res, "Mision no encontrada", 404);
    }

    const mission = missionResult.rows[0];

    if (!["PUBLISHED", "IN_PROGRESS"].includes(mission.status)) {
      await client.query("ROLLBACK");
      return fail(res, "La mision no puede validarse en este estado", 400);
    }

    const registration = await client.query(
      "SELECT * FROM mission_registrations WHERE mission_id = $1 AND user_id = $2 AND status <> 'CANCELLED' FOR UPDATE",
      [mission.id, user_id]
    );

    if (registration.rows.length === 0) {
      await client.query("ROLLBACK");
      return fail(res, "El usuario no esta inscrito en la mision", 400);
    }

    let qrSessionId = null;
    if (mission.requires_qr_validation) {
      const qr = await client.query(
        `SELECT * FROM qr_sessions
         WHERE token = $1 AND user_id = $2 AND used_at IS NULL AND expires_at > NOW()
         FOR UPDATE`,
        [qr_token, user_id]
      );

      if (qr.rows.length === 0) {
        await client.query("ROLLBACK");
        return fail(res, "QR invalido o expirado", 400);
      }

      qrSessionId = qr.rows[0].id;
      await client.query("UPDATE qr_sessions SET used_at = NOW() WHERE id = $1", [qrSessionId]);
    }

    const validation = await client.query(
      `INSERT INTO mission_validations (
        mission_id, user_id, auditor_id, qr_session_id, status, notes, points_awarded
      )
      VALUES ($1, $2, $3, $4, 'APPROVED', $5, $6)
      RETURNING *`,
      [mission.id, user_id, req.user.id, qrSessionId, notes || null, mission.points_reward]
    );

    await client.query(
      "UPDATE mission_registrations SET status = 'COMPLETED', updated_at = NOW() WHERE mission_id = $1 AND user_id = $2",
      [mission.id, user_id]
    );
    await client.query(
      `UPDATE users
       SET points = points + $1,
           total_points_earned = total_points_earned + $1,
           completed_missions = completed_missions + 1,
           updated_at = NOW()
       WHERE id = $2`,
      [mission.points_reward, user_id]
    );
    await client.query(
      `INSERT INTO point_transactions (user_id, points, transaction_type, description, mission_id, created_by)
       VALUES ($1, $2, 'EARNED', $3, $4, $5)`,
      [user_id, mission.points_reward, `Puntos por mision: ${mission.title}`, mission.id, req.user.id]
    );
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Mision validada', $2, 'MISSION')`,
      [user_id, `Recibiste ${mission.points_reward} puntos por completar ${mission.title}`]
    );
    await createSystemLog({
      client,
      actorId: req.user.id,
      targetUserId: user_id,
      action: "MISSION_VALIDATED",
      entityType: "missions",
      entityId: mission.id,
      newValues: validation.rows[0],
      req,
    });

    await client.query("COMMIT");
    return ok(res, "Participacion validada correctamente", { validation: validation.rows[0] }, 201);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return fail(res, "El usuario ya fue validado para esta mision", 409);
    }
    throw error;
  } finally {
    client.release();
  }
};

export const rejectMission = async (req, res) => {
  const { user_id, notes } = req.body;

  if (!user_id) {
    return fail(res, "user_id es requerido", 400);
  }

  const result = await pool.query(
    `INSERT INTO mission_validations (mission_id, user_id, auditor_id, status, notes)
     VALUES ($1, $2, $3, 'REJECTED', $4)
     RETURNING *`,
    [req.params.id, user_id, req.user.id, notes || null]
  );

  return ok(res, "Participacion rechazada correctamente", { validation: result.rows[0] }, 201);
};

export const listEvidences = async (req, res) => {
  const conditions = [];
  const values = [];
  appendFilter(conditions, values, "status", req.query.status);
  appendFilter(conditions, values, "mission_id", req.query.mission_id);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(`SELECT * FROM mission_evidences ${where} ORDER BY created_at DESC`, values);
  return ok(res, "Evidencias obtenidas correctamente", { evidences: result.rows });
};

export const reviewEvidence = (status) => async (req, res) => {
  const result = await pool.query(
    `UPDATE mission_evidences
     SET status = $1, reviewed_by = $2, review_notes = $3, reviewed_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [status, req.user.id, req.body.notes || null, req.params.id]
  );

  if (result.rows.length === 0) {
    return fail(res, "Evidencia no encontrada", 404);
  }

  return ok(res, "Evidencia revisada correctamente", { evidence: result.rows[0] });
};
