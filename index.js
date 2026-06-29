import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import dotenv from "dotenv";
import { swaggerSpec } from "./src/config/swagger.js";
import { connectDB } from "./src/db/connection.js";
import { initDatabase } from "./src/db/initDatabase.js";
import { errorMiddleware, notFound } from "./src/middleware/error.middleware.js";
import adminRoutes from "./src/routes/admin.routes.js";
import authRoutes from "./src/routes/auth.routes.js";
import dashboardRoutes from "./src/routes/dashboard.routes.js";
import missionRoutes from "./src/routes/mission.routes.js";
import notificationRoutes from "./src/routes/notification.routes.js";
import organizationRoutes from "./src/routes/organization.routes.js";
import pointRoutes from "./src/routes/point.routes.js";
import qrRoutes from "./src/routes/qr.routes.js";
import recyclingRoutes from "./src/routes/recycling.routes.js";
import rewardRoutes from "./src/routes/reward.routes.js";
import userRoutes from "./src/routes/user.routes.js";

dotenv.config();

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://ecopointsrd.vercel.app",
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Bienvenido a EcoPointsRD API",
    data: { version: "1.0.0" },
  });
});

app.get("/api-docs.json", (req, res) => {
  res.json(swaggerSpec);
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/missions", missionRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/points", pointRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/recycling", recyclingRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFound);
app.use(errorMiddleware);

const startServer = async () => {
  await connectDB();
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
