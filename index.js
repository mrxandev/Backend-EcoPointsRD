import {connectDB} from './src/db/connection.js'
import express from "express"
import dotenv from "dotenv"
import authRoutes from "./src/routes/auth.routes.js"
import adminRoutes from "./src/routes/admin.routes.js"

dotenv.config()




const app= express();
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
