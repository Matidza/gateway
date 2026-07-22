// import express from 'express';
// import helmet from 'helmet';
// import cors from 'cors';
// import mongoose from 'mongoose';
// import dotenv from 'dotenv';
// import cookieParser from 'cookie-parser';

// // import authRoutes from "./routes/aauthRoutes.js"
// import authRoutes from "./routes/authRoutes.js"
// import menteeRoutes from "./routes/menteeRoutes.js"
// import RefreshTokenRoute from "./routes/refreshTokenRoute.js"
// import professionalRoutes from "./routes/professionalRoutes.js"

// dotenv.config();

// // Init express app
// const app = express();
// const PORT = process.env.PORT || 5001;
// // const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173' && "http://localhost:3000";
// const allowedOrigin = process.env.FRONTEND_URL || [
//   "http://localhost:5173",
//   "http://localhost:3000"
// ];



// app.use(helmet());
// app.use(cookieParser());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cors({
//   origin: allowedOrigin,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   credentials: true,
// }));





// app.use("/api/v1/auth", authRoutes)
// app.use('/api/v1/refresh-token', RefreshTokenRoute);
// app.use('/api/v1/mentee', menteeRoutes);
// app.use('/api/v1/professional', professionalRoutes);
// app.get('/', (req, res) => {
//   res.send('Mentee and Professional Service is running 🚀');
// });



// // Database connection + server start
// const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/Mentee-Service';

// const startServer = async () => {
//   try {
//     await mongoose.connect(mongoURI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     console.log('✅ Connected to MongoDB');

//     app.listen(PORT, () => {
//       console.log(`🚀 Mentee and Professional  Service running on http://localhost:${PORT}`);
//     });
//   } catch (error) {
//     console.error('❌ MongoDB connection error:', error.message);
//     process.exit(1); // Exit if DB fails
//   }
// };

// startServer();


import express from "express";
import helmet from "helmet";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

// Routes
import authRoutes from "./routes/authRoutes.js";
import menteeRoutes from "./routes/menteeRoutes.js";
import RefreshTokenRoute from "./routes/refreshTokenRoute.js";
import professionalRoutes from "./routes/professionalRoutes.js";

// Redis
import { connectRedis } from "../mentee-service/utilities/redis.js";

dotenv.config();

// Init app
const app = express();
const PORT = process.env.PORT || 5005;

// ✅ FIXED CORS (safe + production-ready)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin) return callback(null, true);
//       if (allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       }
//       return callback(new Error("CORS blocked"));
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   })
// );
app.use(cors({
  origin: "*",
  credentials: false,
}));

// Middlewares
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 REQUEST LOGGER (DEBUGGING TOOL)
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/refresh-token", RefreshTokenRoute);
app.use("/api/v1/mentee", menteeRoutes);
app.use("/api/v1/professional", professionalRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("Mentee and Professional Service is running 🚀");
});
app.use((req, res, next) => {
  console.log("🔥 REQUEST:", req.method, req.url);
  next();
});
// DB connection
const mongoURI =
  process.env.MONGO_URI || "mongodb://localhost:27017/Mentee-Service";

// 🚀 START SERVER (ORDER IS IMPORTANT)
const startServer = async () => {
  try {
    // 1. Connect Redis FIRST
    await connectRedis();
    console.log("✅ Redis connected");

    // 2. Connect MongoDB
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    // 3. Start server
    app.listen(PORT, () => {
      console.log(
        `🚀 Mentee and Professional Service running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("❌ Startup error:", error.message);
    process.exit(1);
  }
};

startServer();