import bcrypt from "bcryptjs";
import {pool,connectDB} from "../db/connection.js";
import { generateToken } from "../utils/jwt.js";

export const register = async (req, res) => {
  try {
    let {
      cedula,
      first_name,
      last_name,
      email,
      password,
      phone,
    } = req.body;

    if (!cedula || !first_name || !last_name || !email || !password) {
      return res.status(400).json({
        message: "Cédula, nombre, apellido, email y contraseña son requeridos",
      });
    }

    cedula = cedula.replace(/\D/g, "");

    if (!/^\d{11}$/.test(cedula)) {
      return res.status(400).json({
        message: "La cédula debe tener 11 dígitos",
      });
    }

    const userExists = await pool.query(
      `SELECT id FROM users 
       WHERE email = $1 OR cedula = $2`,
      [email, cedula]
    );

    if (userExists.rows.length > 0) {
      return res.status(409).json({
        message: "El email o la cédula ya están registrados",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (
        cedula,
        first_name,
        last_name,
        email,
        password,
        phone
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id,
        cedula,
        first_name,
        last_name,
        email,
        phone,
        role,
        status,
        points,
        created_at`,
      [
        cedula,
        first_name,
        last_name,
        email.toLowerCase(),
        hashedPassword,
        phone || null,
      ]
    );

    return res.status(201).json({
      message: "Usuario registrado correctamente",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error en register:", error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

export const login = async (req, res) => {
  try {
    let { email, cedula, password } = req.body;

    if ((!email && !cedula) || !password) {
      return res.status(400).json({
        message: "Debes enviar email o cédula y contraseña",
      });
    }

    if (cedula) {
      cedula = cedula.replace(/\D/g, "");
    }

    const result = await pool.query(
      `SELECT * FROM users
       WHERE email = $1 OR cedula = $2`,
      [email ? email.toLowerCase() : null, cedula || null]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Credenciales inválidas",
      });
    }

    const user = result.rows[0];

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        message: "Tu cuenta no está activa",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Credenciales inválidas",
      });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      cedula: user.cedula,
      role: user.role,
    });

    return res.json({
      message: "Login correcto",
      token,
      user: {
        id: user.id,
        cedula: user.cedula,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        points: user.points,
        is_verified: user.is_verified,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        id,
        cedula,
        first_name,
        last_name,
        email,
        phone,
        role,
        status,
        is_verified,
        province,
        municipality,
        profile_image,
        points,
        total_points_earned,
        total_points_redeemed,
        completed_missions,
        created_at
      FROM users
      WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    return res.json({
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error en getProfile:", error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};