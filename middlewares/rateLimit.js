// middlewares/onboardingRateLimiter.js
import { redis } from '../utilities/redis.js';

// export const professionalRateLimiter = ({
//   limit = 100,
//   window = 6000, // 10 minutes (seconds)
// }) => {
//   return async (req, res, next) => {
//     try {
//       // authenticateToken already ran → req.user exists
//       const userId = req.user?.userId;

//       if (!userId) {
//         return res.status(401).json({
//           success: false,
//           message: 'Unauthorized',
//         });
//       }

//       const key = `rate:onboarding:${userId}`;
//       const count = await redis.incr(key);

//       if (count === 1) {
//         await redis.expire(key, window);
//       }

//       if (count > limit) {
//         return res.status(429).json({
//           success: false,
//           message:
//             'Too many onboarding attempts. Please try again later.',
//         });
//       }

//       next();
//     } catch (err) {
//       // ✅ Fail open — never block onboarding if Redis fails
//       console.error('Rate limiter error:', err);
//       next();
//     }
//   };
// };




export const menteeRateLimiter = ({ limit, window }) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      const ip = req.ip;

      const key = userId
        ? `rate:onboarding:user:${userId}`
        : `rate:onboarding:ip:${ip}`;

      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, window);
      }

      if (count > limit) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Try again later.',
        });
      }

      next();
    } catch (err) {
      console.error('Rate limiter error:', err);
      next();
    }
  };
};

export const professionalRateLimiter = ({ limit, window }) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      const ip = req.ip;

      const key = userId
        ? `rate:onboarding:user:${userId}`
        : `rate:onboarding:ip:${ip}`;

      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, window);
      }

      if (count > limit) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Try again later.',
        });
      }

      next();
    } catch (err) {
      console.error('Rate limiter error:', err);
      next();
    }
  };
};