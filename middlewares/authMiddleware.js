// // middleware/authMiddleware.js
// // The gateway is the single place that validates JWTs (per system design §3.2).
// // Downstream services should NOT re-verify the token — they trust the
// // identity headers the gateway attaches (x-user-id / x-user-role), because
// // only the gateway is reachable from the outside; service-to-service traffic
// // stays on the internal network.

// import jwt from "jsonwebtoken";

// const JWT_SECRET = process.env.SECRET_ACCESS_TOKEN;

// /**
//  * Verifies the access token (cookie or Authorization header), attaches
//  * { userId, role } to req.user, and forwards them as headers so proxied
//  * requests carry identity without the downstream service touching JWTs.
//  */
// export const requireAuth = (req, res, next) => {
//   try {
//     const bearer = req.headers.authorization?.startsWith("Bearer ")
//       ? req.headers.authorization.split(" ")[1]
//       : null;
//     const token = req.cookies?.accessToken || bearer;

//     if (!token) {
//       return res.status(401).json({ message: "Authentication required" });
//     }

//     const decoded = jwt.verify(token, JWT_SECRET);
//     req.user = { userId: decoded.userId, role: decoded.role };

//     // Forwarded to whichever service the gateway proxies this request to.
//     req.headers["x-user-id"] = decoded.userId;
//     req.headers["x-user-role"] = decoded.role;

//     next();
//   } catch (err) {
//     return res.status(401).json({ message: "Invalid or expired token" });
//   }
// };

// /**
//  * Restricts a route to one or more roles. Use after requireAuth.
//  * e.g. router.post('/payouts', requireAuth, requireRole('admin'), handler)
//  */
// export const requireRole = (...allowedRoles) => (req, res, next) => {
//   if (!req.user || !allowedRoles.includes(req.user.role)) {
//     return res.status(403).json({ message: "Insufficient permissions" });
//   }
//   next();
// };



import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SECRET_ACCESS_TOKEN;

export const requireAuth = (req, res, next) => {
  try {
    // Prefer the HttpOnly cookie
    const token =
      req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);
    consle.log(token)
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    

    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      avatar: decoded.avatar,
      role: decoded.role,
    };

    // Forward identity to downstream services
    req.headers["x-user-id"] = decoded.id;
    req.headers["x-user-email"] = decoded.email;
    req.headers["x-user-role"] = decoded.role;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
};

export const requireRole =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };