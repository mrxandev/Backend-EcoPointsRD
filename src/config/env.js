import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  nodeEnv: process.env.NODE_ENV || "development",
  admin: {
    email: process.env.ADMIN_EMAIL || "admin@ecopointsrd.com",
    password: process.env.ADMIN_PASSWORD || "Admin123456",
    firstName: process.env.ADMIN_FIRST_NAME || "Admin",
    lastName: process.env.ADMIN_LAST_NAME || "EcoPoints",
    cedula: process.env.ADMIN_CEDULA || "00000000000",
  },
};
