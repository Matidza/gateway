// import dotenv from "dotenv";
// import express from "express";
// import helmet from "helmet";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import { createProxyMiddleware } from "http-proxy-middleware";
// import mongoose from "mongoose";
// import authenticateToken from "./middlewares/identifier.js";

// // Auth stays at the gateway (design doc §3.2: "issued by an auth module,
// // either standalone or part of the gateway"). Everything else — mentee,
// // professional, company, payment, video — is a separate service the gateway
// // only *routes to*, it doesn't own their business logic.
// import authRoutes from "./routes/authRoutes.js";
// import RefreshTokenRoute from "./routes/refreshTokenRoute.js";
// // router.post("/create", requireAuth, authorize("mentee"), menteeRateLimiter({limit: 50, window: 9990}), createMenteeProfile)// rate limit

// import { connectRedis } from "../mentee-service/utilities/redis.js";
// import { requireAuth, requireRole } from "./middlewares/authMiddleware.js";
// import { authorize } from "./middlewares/authorization.js";
// import { createRateLimiter, RATE_LIMITS } from "./middlewares/rateLimiter.js";
// import { SERVICE_URLS } from "./config/services.js";

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 1000;

// const allowedOrigins = (process.env.FRONTEND_URLS || "http://localhost:5173")
//   .split(",")
//   .map((o) => o.trim());

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
//       return callback(new Error("CORS blocked"));
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//   })
// );

// app.use(
//   helmet({
//     crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
//   })
// );

// // --- Payment provider webhooks -------------------------------------------
// // Must be mounted BEFORE express.json() and BEFORE auth/rate-limiting.
// // Providers (Stripe/Paystack) sign the raw body, verified inside the payment
// // service itself — the gateway must not touch auth here (design doc §4.4)
// // and should just forward the untouched raw body straight through.
// app.use(
//   "/api/v1/payments/webhooks",
//   express.raw({ type: "*/*" }),
//   createProxyMiddleware({
//     target: SERVICE_URLS.payment,
//     changeOrigin: true,
//     onError: (err, req, res) => {
//       console.error("❌ Payment webhook proxy error:", err.message);
//       res.status(503).json({ message: "Payment service unavailable" });
//     },
//   })
// );

// // --- Standard middleware ---------------------------------------------------
// app.use(cookieParser());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// app.use((req, res, next) => {
//   console.log(`➡️ ${req.method} ${req.url}`);
//   next();
// });

// // --- Health check -----------------------------------------------------------
// // Used by the load balancer (design doc §3.1).
// app.get("/health", requireAuth, requireRole('mentee'), (req, res) => {
//   res.json({ status: "ok", service: "gateway", timestamp: new Date().toISOString() });
// });

// // --- MongoDB connection -------------------------------------------------
// // The gateway owns its own auth/user collection (GatewayUserModel), so it
// // needs its own Mongo connection — this is separate from any per-service DB.
// const connectDB = async () => {
//   if (!process.env.MONGO_URI) {
//     throw new Error("MONGO_URI is not set in the environment");
//   }
//   await mongoose.connect(process.env.MONGO_URI);
//   console.log("✅ MongoDB connected");
// };

// const startServer = async () => {
//   try {
//     await connectDB();

//     const redisClient = await connectRedis();
//     console.log("✅ Redis connected");

//     const authLimiter = createRateLimiter(redisClient, RATE_LIMITS.auth);
//     const standardLimiter = createRateLimiter(redisClient, RATE_LIMITS.standard);

//     // --- Auth (local to the gateway) --------------------------------------
//     app.use("/api/v1/auth", authRoutes); 
//     app.use("/api/v1/refresh-token", authLimiter, RefreshTokenRoute);

//     // --- Proxied microservices ---------------------------------------------
//     // Each entry: authenticate -> rate-limit -> proxy. Downstream services
//     // receive x-user-id / x-user-role headers instead of re-verifying JWTs.
//     const proxyService = (name, target) =>
//       createProxyMiddleware({
//         target,
//         changeOrigin: true,
//         onProxyReq: (proxyReq, req) => {
//           if (req.user) {
//             proxyReq.setHeader("x-user-id", req.user.userId);
//             proxyReq.setHeader("x-user-role", req.user.role);
//           }
//         },
//         // Circuit-breaking-style behavior: fail fast with a clear error
//         // instead of letting the client hang if a service is down
//         // (design doc §3.2).
//         onError: (err, req, res) => {
//           console.error(`❌ ${name} service proxy error:`, err.message);
//           res.status(503).json({ message: `${name} service unavailable` });
//         },
//       });

//     app.use(
//       "/api/v1",
//       requireAuth,
//       requireRole('mentee', 'admin'),
//       standardLimiter,
//       proxyService("Mentee", SERVICE_URLS.mentee)
//     );
//     app.use(
//       "/api/v1/professional",
//       requireAuth,
//       requireRole('professional', 'admin'),
//       standardLimiter,
//       proxyService("Professional", SERVICE_URLS.professional)
//     );
//     app.use(
//       "/api/v1/company",
//       requireAuth,
//       requireRole('company', 'admin'),
//       standardLimiter,
//       proxyService("Company", SERVICE_URLS.company)
//     );
//     app.use(
//       "/api/v1/payments",
//       requireAuth,
//       standardLimiter,
//       proxyService("Payment", SERVICE_URLS.payment)
//     );

//     // app.use(
//     //   "/api/v1/sessions",
//     //   requireAuth,
//     //   requireRole('mentee', 'admin', 'professional'),
//     //   standardLimiter,
//     //   proxyService("Video", SERVICE_URLS.video)
//     // );

//     // app.use(
//     //   "/api/v1/video",
//     //   requireAuth,
//     //   requireRole('mentee', 'admin', 'professional'),
//     //   standardLimiter,
//     //   proxyService("Video", SERVICE_URLS.video)
//     // );

//     app.get("/", requireAuth, (req, res) => {
//       res.send("inTurn API Gateway is running 🚀");
//     });

//     app.listen(PORT, () => {
//       console.log(`🚀 API Gateway running on http://localhost:${PORT}`);
//     });
//   } catch (error) {
//     console.error("❌ Startup error:", error.message);
//     process.exit(1);
//   }
// };

// startServer();



import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import mongoose from "mongoose";
import authenticateToken from "./middlewares/identifier.js";

// Auth stays at the gateway (design doc §3.2: "issued by an auth module,
// either standalone or part of the gateway"). Everything else — mentee,
// professional, company, payment, video — is a separate service the gateway
// only *routes to*, it doesn't own their business logic.
import authRoutes from "./routes/authRoutes.js";
import RefreshTokenRoute from "./routes/refreshTokenRoute.js";
// router.post("/create", requireAuth, authorize("mentee"), menteeRateLimiter({limit: 50, window: 9990}), createMenteeProfile)// rate limit

import { connectRedis } from "../mentee-service/utilities/redis.js";
import { requireAuth, requireRole } from "./middlewares/authMiddleware.js";
import { authorize } from "./middlewares/authorization.js";
import { createRateLimiter, RATE_LIMITS } from "./middlewares/rateLimiter.js";
import { SERVICE_URLS } from "./config/services.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 1000;

const allowedOrigins = (process.env.FRONTEND_URLS || "http://localhost:5173")
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
app.get("/health", requireAuth, requireRole('mentee'), (req, res) => {
  res.json({ status: "ok", service: "gateway", timestamp: new Date().toISOString() });
});

// --- MongoDB connection -------------------------------------------------
// The gateway owns its own auth/user collection (GatewayUserModel), so it
// needs its own Mongo connection — this is separate from any per-service DB.
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set in the environment");
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");
};

const startServer = async () => {
  try {
    await connectDB();

    const redisClient = await connectRedis();
    console.log("✅ Redis connected");

    const authLimiter = createRateLimiter(redisClient, RATE_LIMITS.auth);
    const standardLimiter = createRateLimiter(redisClient, RATE_LIMITS.standard);

    // --- Auth (local to the gateway) --------------------------------------
    app.use("/api/v1/auth", authRoutes); 
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
            // req.user.id (not .userId — requireAuth builds req.user as
            // { id, email, name, avatar, role }; .userId doesn't exist and
            // was silently overwriting the correct x-user-id header set
            // by requireAuth with "undefined").
            proxyReq.setHeader("x-user-id", req.user.id);
            proxyReq.setHeader("x-user-role", req.user.role);
          }
          // express.json() upstream already consumed the request stream to
          // populate req.body — without this, http-proxy-middleware has
          // nothing left to pipe through on POST/PUT/PATCH requests, and
          // the downstream service hangs waiting for a body that never
          // arrives (this is what was causing the 408 Request Timeout).
          fixRequestBody(proxyReq, req);
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
      "/api/v1",
      requireAuth,
      requireRole('mentee', 'admin'),
      standardLimiter,
      proxyService("Mentee", SERVICE_URLS.mentee)
    );
    app.use(
      "/api/v1/professional",
      requireAuth,
      requireRole('professional', 'admin'),
      standardLimiter,
      proxyService("Professional", SERVICE_URLS.professional)
    );
    app.use(
      "/api/v1/company",
      requireAuth,
      requireRole('company', 'admin'),
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
    //   requireRole('mentee', 'admin', 'professional'),
    //   standardLimiter,
    //   proxyService("Video", SERVICE_URLS.video)
    // );

    // app.use(
    //   "/api/v1/video",
    //   requireAuth,
    //   requireRole('mentee', 'admin', 'professional'),
    //   standardLimiter,
    //   proxyService("Video", SERVICE_URLS.video)
    // );

    app.get("/", requireAuth, (req, res) => {
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