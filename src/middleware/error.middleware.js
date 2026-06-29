import { env } from "../config/env.js";

export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
    errors: [],
  });
};

export const errorMiddleware = (error, req, res, next) => {
  console.error(error);

  res.status(error.status || 500).json({
    success: false,
    message: error.publicMessage || "Error interno del servidor",
    errors: env.nodeEnv === "development" ? [error.message] : [],
  });
};
