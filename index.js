// import express from "express";
// import helmet from "helmet";
// import cors from "cors";
// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import cookieParser from "cookie-parser";

// // Routes
// import authRoutes from "./routes/authRoutes.js";
// import menteeRoutes from "./routes/menteeRoutes.js";
// import RefreshTokenRoute from "./routes/refreshTokenRoute.js";
// import professionalRoutes from "./routes/professionalRoutes.js";

// // Redis
// import { connectRedis } from "../mentee-service/utilities/redis.js";

// dotenv.config();

// // Init app
// const app = express();
// const PORT = process.env.PORT || 1000;

// // ✅ FIXED CORS (safe + production-ready)
// const allowedOrigins = [
//   "http://localhost:5173",
//   "http://localhost:3000",
// ];


// app.use(cors({
//   origin: "*",
//   credentials: false,
// }));

// // Middlewares
// app.use(helmet());
// app.use(cookieParser());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // 🔥 REQUEST LOGGER (DEBUGGING TOOL)
// app.use((req, res, next) => {
//   console.log(`➡️ ${req.method} ${req.url}`);
//   next();
// });

// // Routes
// app.use("/api/v1/auth", authRoutes);
// app.use("/api/v1/refresh-token", RefreshTokenRoute);
// app.use("/api/v1/mentee", menteeRoutes);
// app.use("/api/v1/professional", professionalRoutes);

// // Health check
// app.get("/", (req, res) => {
//   res.send("Gateway Service is Service is running 🚀");
// });
// app.use((req, res, next) => {
//   console.log("🔥 REQUEST:", req.method, req.url);
//   next();
// });
// // DB connection
// const mongoURI =
//   process.env.MONGO_URI;

// // 🚀 START SERVER (ORDER IS IMPORTANT)
// const startServer = async () => {
//   try {
//     // 1. Connect Redis FIRST
//     await connectRedis();
//     console.log("✅ Redis connected");

//     // 2. Connect MongoDB
//     await mongoose.connect(mongoURI);
//     console.log("✅ Connected to MongoDB");

//     // 3. Start server
//     app.listen(PORT, () => {
//       console.log(
//         `🚀 Gateway Service is running on http://localhost:${PORT}`
//       );
//     });
//   } catch (error) {
//     console.error("❌ Startup error:", error.message);
//     process.exit(1);
//   }
// };

// startServer();





import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { createProxyMiddleware } from "http-proxy-middleware";

// Auth stays at the gateway (design doc §3.2: "issued by an auth module,
// either standalone or part of the gateway"). Everything else — mentee,
// professional, company, payment, video — is a separate service the gateway
// only *routes to*, it doesn't own their business logic.
import authRoutes from "./routes/authRoutes.js";
import RefreshTokenRoute from "./routes/refreshTokenRoute.js";

import { connectRedis } from "../mentee-service/utilities/redis.js";
import { requireAuth } from "./middlewares/authMiddleware.js";
import { createRateLimiter, RATE_LIMITS } from "./middlewares/rateLimiter.js";
import { SERVICE_URLS } from "./config/services.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 1000;

const allowedOrigins = (process.env.FRONTEND_URLS || "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS blocked"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);

// --- Payment provider webhooks -------------------------------------------
// Must be mounted BEFORE express.json() and BEFORE auth/rate-limiting.
// Providers (Stripe/Paystack) sign the raw body, verified inside the payment
// service itself — the gateway must not touch auth here (design doc §4.4)
// and should just forward the untouched raw body straight through.
app.use(
  "/api/v1/payments/webhooks",
  express.raw({ type: "*/*" }),
  createProxyMiddleware({
    target: SERVICE_URLS.payment,
    changeOrigin: true,
    onError: (err, req, res) => {
      console.error("❌ Payment webhook proxy error:", err.message);
      res.status(503).json({ message: "Payment service unavailable" });
    },
  })
);

// --- Standard middleware ---------------------------------------------------
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// --- Health check -----------------------------------------------------------
// Used by the load balancer (design doc §3.1).
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "gateway", timestamp: new Date().toISOString() });
});

const startServer = async () => {
  try {
    const redisClient = await connectRedis();
    console.log("✅ Redis connected");

    const authLimiter = createRateLimiter(redisClient, RATE_LIMITS.auth);
    const standardLimiter = createRateLimiter(redisClient, RATE_LIMITS.standard);

    // --- Auth (local to the gateway) --------------------------------------
    app.use("/api/v1/auth", authLimiter, authRoutes);
    app.use("/api/v1/refresh-token", authLimiter, RefreshTokenRoute);

    // --- Proxied microservices ---------------------------------------------
    // Each entry: authenticate -> rate-limit -> proxy. Downstream services
    // receive x-user-id / x-user-role headers instead of re-verifying JWTs.
    const proxyService = (name, target) =>
      createProxyMiddleware({
        target,
        changeOrigin: true,
        onProxyReq: (proxyReq, req) => {
          if (req.user) {
            proxyReq.setHeader("x-user-id", req.user.userId);
            proxyReq.setHeader("x-user-role", req.user.role);
          }
        },
        // Circuit-breaking-style behavior: fail fast with a clear error
        // instead of letting the client hang if a service is down
        // (design doc §3.2).
        onError: (err, req, res) => {
          console.error(`❌ ${name} service proxy error:`, err.message);
          res.status(503).json({ message: `${name} service unavailable` });
        },
      });

    app.use(
      "/api/v1/mentee",
      requireAuth,
      standardLimiter,
      proxyService("Mentee", SERVICE_URLS.mentee)
    );
    app.use(
      "/api/v1/professional",
      requireAuth,
      standardLimiter,
      proxyService("Professional", SERVICE_URLS.professional)
    );
    app.use(
      "/api/v1/company",
      requireAuth,
      standardLimiter,
      proxyService("Company", SERVICE_URLS.company)
    );
    app.use(
      "/api/v1/payments",
      requireAuth,
      standardLimiter,
      proxyService("Payment", SERVICE_URLS.payment)
    );

    // app.use(
    //   "/api/v1/sessions",
    //   requireAuth,
    //   standardLimiter,
    //   proxyService("Video", SERVICE_URLS.video)
    // );

    // app.use(
    //   "/api/v1/video",
    //   requireAuth,
    //   standardLimiter,
    //   proxyService("Video", SERVICE_URLS.video)
    // );

    app.get("/", (req, res) => {
      res.send("inTurn API Gateway is running 🚀");
    });

    app.listen(PORT, () => {
      console.log(`🚀 API Gateway running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Startup error:", error.message);
    process.exit(1);
  }
};

startServer();