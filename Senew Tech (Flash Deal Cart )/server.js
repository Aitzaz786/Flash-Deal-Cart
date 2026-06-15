import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Dbconnection } from "./Config/Dbconnection.js";
import { connectRedis } from "./Services/RedisService.js";
import ProductRoutes from "./Routes/Product.js";
import ReservationRoutes from "./Routes/Reservation.js";
import { errorHandler } from "./Middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const startServer = async () => {
  try {
    await Dbconnection();

    const redisUrl = process.env.UPSTASH_REDIS_URL;
    if (redisUrl && !redisUrl.includes("your_upstash_redis_url_here")) {
      await connectRedis();
    } else {
      console.warn("UPSTASH_REDIS_URL not configured — set it in .env for reservation features");
    }

    app.use("/api", ProductRoutes);
    app.use("/api", ReservationRoutes);

    app.get("/", (req, res) => {
      res.status(200).json({ message: "Flash Deal API server is running" });
    });

    app.use((req, res) => {
      res.status(404).json({ success: false, message: "Route not found" });
    });

    app.use(errorHandler);

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
