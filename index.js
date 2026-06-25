import {connectDB} from './src/db/connection.js'
import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import authRoutes from "./src/routes/auth.routes.js"
import adminRoutes from "./src/routes/admin.routes.js"

dotenv.config()

const allowedOrigins = [
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

const app= express();
app.use(cors(corsOptions))
app.options(/.*/, cors(corsOptions))
app.use(express.json())


const PORT= process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.json({
    message: "Bienvenido a EcoPointsRD API",
    version: "1.0.0"
  });
});

app.use('/api/auth',authRoutes)
app.use("/api/admin", adminRoutes)


const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
