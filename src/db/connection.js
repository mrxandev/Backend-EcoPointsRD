import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const useSsl = process.env.DB_SSL === "true" || process.env.NODE_ENV === "production";

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    };

export const pool = new Pool(poolConfig);

export const connectDB = async () => {
  try {
    const client = await pool.connect();

    console.log("Base de Datos conectada");

    client.release();
  } catch (error) {
    console.error("Error al conectar:", error);
    process.exit(1);
  }
};
