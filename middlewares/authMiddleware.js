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

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    

    req.user = {
      id: decoded._id,
      email: decoded.email,
      name: decoded.name,
      avatar: decoded.avatar,
      role: decoded.role,
    };
    console.log(user)

    // Forward identity to downstream services
    req.headers["x-user-id"] = decoded._id;
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