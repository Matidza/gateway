// // redis.js
// import { createClient } from 'redis';

// export const redis = createClient({
//   url: process.env.REDIS_URL || 'redis://localhost:6379',
// });

// redis.on('error', (err) => {
//   console.error('Redis error:', err);
// });

// await redis.connect();

import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

export const connectRedis = async () => {
  if (!redis.isOpen) {
    await redis.connect();
    console.log("✅ Redis connected");
  }
};