// middleware/rateLimiter.js
// Redis-backed sliding-window rate limiting at the gateway (design doc §3.2).
// NOTE: this expects a connected ioredis/node-redis client to be passed in —
// wire it up to whatever your utilities/redis.js actually exports. If
// connectRedis() doesn't currently return the client, update it to do so,
// e.g.:
//   export const connectRedis = async () => {
//     await client.connect();
//     return client;
//   };

/**
 * Creates a rate-limiting middleware.
 * @param {import('ioredis').Redis} redisClient - connected Redis client
 * @param {object} opts
 * @param {number} opts.windowSeconds - size of the sliding window
 * @param {number} opts.maxRequests - max requests allowed per window
 * @param {(req) => string} [opts.keyFn] - how to identify the caller (defaults to userId if authed, else IP)
 */
export const createRateLimiter = (redisClient, { windowSeconds, maxRequests, keyFn }) => {
  return async (req, res, next) => {
    if (!redisClient) {
      // Fail open rather than take the gateway down if Redis is unreachable —
      // but log loudly so it gets noticed.
      console.error("⚠️ Rate limiter: no Redis client available, skipping check");
      return next();
    }

    const identity = keyFn ? keyFn(req) : req.user?.userId || req.ip;
    const key = `ratelimit:${req.baseUrl}:${identity}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      const pipeline = redisClient.multi();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      pipeline.zcard(key);
      pipeline.expire(key, windowSeconds);
      const results = await pipeline.exec();

      const count = results[2][1];

      if (count > maxRequests) {
        return res.status(429).json({ message: "Too many requests, please slow down" });
      }
      next();
    } catch (err) {
      console.error("⚠️ Rate limiter error, failing open:", err.message);
      next();
    }
  };
};

// Presets used in index.js
export const RATE_LIMITS = {
  // Stricter on auth endpoints to blunt credential stuffing (design doc §3.2)
  auth: { windowSeconds: 60, maxRequests: 10 },
  standard: { windowSeconds: 60, maxRequests: 120 },
};
