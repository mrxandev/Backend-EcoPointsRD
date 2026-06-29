import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { env } from "../config/env.js";
import { pool } from "./connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const initDatabase = async () => {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  await pool.query(schema);

  const adminEmail = env.admin.email.toLowerCase();
  const existingAdmin = await pool.query("SELECT id FROM users WHERE email = $1 OR cedula = $2", [
    adminEmail,
    env.admin.cedula,
  ]);

  if (existingAdmin.rows.length === 0) {
    const hashedPassword = await bcrypt.hash(env.admin.password, 10);

    await pool.query(
      `INSERT INTO users (cedula, first_name, last_name, email, password, role, status, is_verified)
       VALUES ($1, $2, $3, $4, $5, 'ADMIN', 'ACTIVE', true)`,
      [env.admin.cedula, env.admin.firstName, env.admin.lastName, adminEmail, hashedPassword]
    );

    console.log("Administrador inicial creado");
  }

  console.log("Tablas verificadas o creadas correctamente");
};
