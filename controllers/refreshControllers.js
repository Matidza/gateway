import jwt from "jsonwebtoken";
import GatewayUserModel from "../models/gatewayUserModel.js";

export async function refreshTokenHandler(req, res) {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No refresh token provided",
      });
    }

    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    const user = await GatewayUserModel.findById(payload.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const newAccessToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        avatar: user.avatar,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      sameSite: "lax", // matches the cookie set at login — "strict" here would silently break cross-page refresh navigation
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000, // 15 minutes, matching the token's actual expiry
    });

    return res.json({
      success: true,
      message: "Access token refreshed",
    });
  } catch (error) {
    console.error("Refresh Token Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
}