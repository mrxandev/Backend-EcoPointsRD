import { fail } from "../utils/response.js";

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, "Usuario no autenticado", 401);
    }

    if (!roles.includes(req.user.role)) {
      return fail(res, "No tienes permisos para realizar esta accion", 403);
    }

    next();
  };
};
