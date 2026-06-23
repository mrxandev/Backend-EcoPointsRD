import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

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