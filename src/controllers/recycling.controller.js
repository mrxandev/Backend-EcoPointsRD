import { pool } from "../db/connection.js";
import { buildSetClause } from "../utils/db.js";
import { fail, ok } from "../utils/response.js";

export const listCenters = async (req, res) => {
  const conditions = ["status = 'ACTIVE'"];
  const values = [];
  if (req.query.province) {
    values.push(req.query.province);
    conditions.push(`province = $${values.length}`);
  }
  if (req.query.municipality) {
    values.push(req.query.municipality);
    conditions.push(`municipality = $${values.length}`);
  }
  const result = await pool.query(
    `SELECT * FROM recycling_centers WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    values
  );
  return ok(res, "Centros obtenidos correctamente", { centers: result.rows });
};

export const adminListCenters = async (req, res) => {
  const conditions = [];
  const values = [];

  if (req.query.status) {
    values.push(req.query.status);
    conditions.push(`status = $${values.length}`);
  }
  if (req.query.province) {
    values.push(req.query.province);
    conditions.push(`province = $${values.length}`);
  }
  if (req.query.municipality) {
    values.push(req.query.municipality);
    conditions.push(`municipality = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT * FROM recycling_centers ${whereClause} ORDER BY created_at DESC`,
    values
  );

  return ok(res, "Centros admin obtenidos correctamente", { centers: result.rows });
};

export const getCenter = async (req, res) => {
  const result = await pool.query("SELECT * FROM recycling_centers WHERE id = $1", [req.params.id]);
  if (result.rows.length === 0) return fail(res, "Centro no encontrado", 404);
  return ok(res, "Centro obtenido correctamente", { center: result.rows[0] });
};

export const createCenter = async (req, res) => {
  const { name, description, province, municipality, address, latitude, longitude, phone } = req.body;
  if (!name) return fail(res, "name es requerido", 400);
  const result = await pool.query(
    `INSERT INTO recycling_centers (name, description, province, municipality, address, latitude, longitude, phone, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [name, description || null, province || null, municipality || null, address || null, latitude || null, longitude || null, phone || null, req.user.id]
  );
  return ok(res, "Centro creado correctamente", { center: result.rows[0] }, 201);
};

export const updateCenter = async (req, res) => {
  const allowed = ["name", "description", "province", "municipality", "address", "latitude", "longitude", "phone"];
  const { values, setClause } = buildSetClause(req.body, allowed);
  if (!setClause) return fail(res, "No hay campos validos para actualizar", 400);
  values.push(req.params.id);
  const result = await pool.query(
    `UPDATE recycling_centers SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values
  );
  if (result.rows.length === 0) return fail(res, "Centro no encontrado", 404);
  return ok(res, "Centro actualizado correctamente", { center: result.rows[0] });
};

export const setCenterStatus = (status) => async (req, res) => {
  const result = await pool.query(
    "UPDATE recycling_centers SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [status, req.params.id]
  );
  if (result.rows.length === 0) return fail(res, "Centro no encontrado", 404);
  return ok(res, "Estado de centro actualizado", { center: result.rows[0] });
};

export const createRecyclingLog = async (req, res) => {
  const { user_id, center_id, material_type, weight_kg, weight_lbs, points_awarded } = req.body;
  if (!user_id || !material_type) return fail(res, "user_id y material_type son requeridos", 400);

  // Limpiar center_id para evitar errores de UUID vacio en Postgres
  const cleanCenterId = center_id && typeof center_id === "string" && center_id.trim() !== "" ? center_id.trim() : null;

  // Calcular peso en KG y LBS
  let lbs = Number(weight_lbs || 0);
  let kg = Number(weight_kg || 0);
  if (!kg && lbs) {
    kg = Math.round(lbs * 0.453592 * 100) / 100;
  } else if (!lbs && kg) {
    lbs = Math.round(kg * 2.20462 * 100) / 100;
  }

  // Calcular puntos automáticos si no vienen especificados
  let points = Number(points_awarded || 0);
  if (!points && lbs > 0) {
    const norm = String(material_type).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    let rate = 10;
    if (norm.includes("alumin") || norm.includes("lata") || norm === "aluminum") rate = 40;
    else if (norm.includes("vidrio") || norm === "glass") rate = 3;
    else if (norm.includes("pet") || norm.includes("botella") || norm === "pet") rate = 10;
    else if (norm.includes("papel") || norm.includes("carton") || norm === "paper") rate = 5;
    else if (norm.includes("electron") || norm === "e_waste") rate = 50;

    points = Math.round(lbs * rate);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const log = await client.query(
      `INSERT INTO recycling_logs (user_id, center_id, material_type, weight_kg, points_awarded, registered_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_id, cleanCenterId, material_type, kg || 0, points, req.user.id]
    );

    if (points > 0) {
      await client.query(
        "UPDATE users SET points = points + $1, total_points_earned = total_points_earned + $1 WHERE id = $2",
        [points, user_id]
      );

      // Transacción de puntos protegida (operación secundaria)
      try {
        await client.query(
          `INSERT INTO point_transactions (user_id, points, transaction_type, description, created_by)
           VALUES ($1, $2, 'EARNED', 'Puntos por reciclaje', $3)`,
          [user_id, points, req.user.id]
        );
      } catch (txErr) {
        console.warn("No se pudo registrar la transacción de puntos secundaria:", txErr.message);
      }

      // Notificación protegida (operación secundaria)
      try {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, 'Reciclaje registrado', $2, 'RECYCLING')`,
          [user_id, `Recibiste ${points} puntos por reciclar`]
        );
      } catch (notifErr) {
        console.warn("No se pudo enviar la notificación secundaria:", notifErr.message);
      }
    }

    await client.query("COMMIT");
    return ok(res, "Reciclaje registrado correctamente", { recyclingLog: log.rows[0] }, 201);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al registrar reciclaje:", error);
    return fail(res, error.message || "Error interno al registrar el reciclaje", 500);
  } finally {
    client.release();
  }
};

export const listRecyclingLogs = async (req, res) => {
  const result = await pool.query("SELECT * FROM recycling_logs ORDER BY created_at DESC");
  return ok(res, "Logs de reciclaje obtenidos correctamente", { recyclingLogs: result.rows });
};
