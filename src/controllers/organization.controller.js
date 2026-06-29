import { pool } from "../db/connection.js";
import { appendFilter, buildSetClause } from "../utils/db.js";
import { fail, ok } from "../utils/response.js";

export const listOrganizations = async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM organizations
     WHERE status = 'ACTIVE'
     ORDER BY created_at DESC`
  );

  return ok(res, "Organizaciones obtenidas correctamente", { organizations: result.rows });
};

export const getOrganization = async (req, res) => {
  const result = await pool.query("SELECT * FROM organizations WHERE id = $1", [req.params.id]);

  if (result.rows.length === 0) {
    return fail(res, "Organizacion no encontrada", 404);
  }

  return ok(res, "Organizacion obtenida correctamente", { organization: result.rows[0] });
};

export const adminListOrganizations = async (req, res) => {
  const conditions = [];
  const values = [];
  appendFilter(conditions, values, "status", req.query.status);
  appendFilter(conditions, values, "organization_type", req.query.type);
  appendFilter(conditions, values, "name", req.query.search, "ILIKE");

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(`SELECT * FROM organizations ${where} ORDER BY created_at DESC`, values);

  return ok(res, "Organizaciones obtenidas correctamente", { organizations: result.rows });
};

export const createOrganization = async (req, res) => {
  const { name, description, organization_type, email, phone, province, municipality, address, logo_url } = req.body;

  if (!name) {
    return fail(res, "El nombre de la organizacion es requerido", 400);
  }

  const result = await pool.query(
    `INSERT INTO organizations (
      name, description, organization_type, email, phone, province, municipality, address, logo_url, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      name,
      description || null,
      organization_type || "OTHER",
      email || null,
      phone || null,
      province || null,
      municipality || null,
      address || null,
      logo_url || null,
      req.user.id,
    ]
  );

  return ok(res, "Organizacion creada correctamente", { organization: result.rows[0] }, 201);
};

export const updateOrganization = async (req, res) => {
  const allowed = [
    "name",
    "description",
    "organization_type",
    "email",
    "phone",
    "province",
    "municipality",
    "address",
    "logo_url",
  ];
  const { values, setClause } = buildSetClause(req.body, allowed);

  if (!setClause) {
    return fail(res, "No hay campos validos para actualizar", 400);
  }

  values.push(req.params.id);
  const result = await pool.query(
    `UPDATE organizations SET ${setClause}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return fail(res, "Organizacion no encontrada", 404);
  }

  return ok(res, "Organizacion actualizada correctamente", { organization: result.rows[0] });
};

export const setOrganizationStatus = (status) => async (req, res) => {
  const result = await pool.query(
    `UPDATE organizations SET status = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  );

  if (result.rows.length === 0) {
    return fail(res, "Organizacion no encontrada", 404);
  }

  return ok(res, "Estado de organizacion actualizado", { organization: result.rows[0] });
};

export const addOrganizationUser = async (req, res) => {
  const { user_id, position } = req.body;

  if (!user_id) {
    return fail(res, "user_id es requerido", 400);
  }

  const result = await pool.query(
    `INSERT INTO organization_users (organization_id, user_id, position)
     VALUES ($1, $2, $3)
     ON CONFLICT (organization_id, user_id)
     DO UPDATE SET position = EXCLUDED.position
     RETURNING *`,
    [req.params.id, user_id, position || null]
  );

  return ok(res, "Usuario asignado a organizacion", { organizationUser: result.rows[0] }, 201);
};

export const removeOrganizationUser = async (req, res) => {
  await pool.query("DELETE FROM organization_users WHERE organization_id = $1 AND user_id = $2", [
    req.params.id,
    req.params.userId,
  ]);

  return ok(res, "Usuario removido de organizacion");
};
