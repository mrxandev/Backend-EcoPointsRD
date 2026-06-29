import bcrypt from "bcryptjs";
import { pool } from "../db/connection.js";
import { generateToken } from "../utils/jwt.js";
import { fail, ok } from "../utils/response.js";

const publicUserFields = `
  id, cedula, first_name, last_name, email, phone, role, status, is_verified,
  province, municipality, address, profile_image, points, total_points_earned,
  total_points_redeemed, completed_missions, created_at, updated_at
`;

const normalizeCedula = (cedula) => String(cedula || "").replace(/\D/g, "");

export const register = async (req, res) => {
  try {
    let { cedula, first_name, last_name, email, password, phone, province, municipality } = req.body;

    if (!cedula || !first_name || !last_name || !email || !password) {
      return fail(res, "Cedula, nombre, apellido, email y contrasena son requeridos", 400);
    }

    cedula = normalizeCedula(cedula);
    email = email.toLowerCase();

    if (!/^\d{11}$/.test(cedula)) {
      return fail(res, "La cedula debe tener 11 digitos", 400);
    }

    const userExists = await pool.query("SELECT id FROM users WHERE email = $1 OR cedula = $2", [
      email,
      cedula,
    ]);

    if (userExists.rows.length > 0) {
      return fail(res, "El email o la cedula ya estan registrados", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (cedula, first_name, last_name, email, password, phone, province, municipality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${publicUserFields}`,
      [cedula, first_name, last_name, email, hashedPassword, phone || null, province || null, municipality || null]
    );

    return ok(res, "Usuario registrado correctamente", { user: result.rows[0] }, 201);
  } catch (error) {
    console.error("Error en register:", error);
    return fail(res, "Error interno del servidor", 500);
  }
};

export const login = async (req, res) => {
  try {
    let { email, cedula, password } = req.body;

    if ((!email && !cedula) || !password) {
      return fail(res, "Debes enviar email o cedula y contrasena", 400);
    }

    cedula = cedula ? normalizeCedula(cedula) : null;
    email = email ? email.toLowerCase() : null;

    const result = await pool.query("SELECT * FROM users WHERE email = $1 OR cedula = $2", [email, cedula]);

    if (result.rows.length === 0) {
      return fail(res, "Credenciales invalidas", 401);
    }

    const user = result.rows[0];

    if (user.status !== "ACTIVE") {
      return fail(res, "Tu cuenta no esta activa", 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return fail(res, "Credenciales invalidas", 401);
    }

    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);

    const token = generateToken({
      id: user.id,
      email: user.email,
      cedula: user.cedula,
      role: user.role,
    });

    return ok(res, "Login correcto", {
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        points: user.points,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    return fail(res, "Error interno del servidor", 500);
  }
};

export const getProfile = async (req, res) => {
  try {
    const result = await pool.query(`SELECT ${publicUserFields} FROM users WHERE id = $1`, [req.user.id]);

    if (result.rows.length === 0) {
      return fail(res, "Usuario no encontrado", 404);
    }

    return ok(res, "Perfil obtenido correctamente", { user: result.rows[0] });
  } catch (error) {
    console.error("Error en getProfile:", error);
    return fail(res, "Error interno del servidor", 500);
  }
};

export const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password || new_password.length < 8) {
      return fail(res, "La contrasena actual y una nueva de minimo 8 caracteres son requeridas", 400);
    }

    const result = await pool.query("SELECT password FROM users WHERE id = $1", [req.user.id]);
    const isValid = await bcrypt.compare(current_password, result.rows[0].password);

    if (!isValid) {
      return fail(res, "La contrasena actual no es correcta", 401);
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.query("UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2", [
      hashedPassword,
      req.user.id,
    ]);

    return ok(res, "Contrasena actualizada correctamente");
  } catch (error) {
    console.error("Error en changePassword:", error);
    return fail(res, "Error interno del servidor", 500);
  }
};
