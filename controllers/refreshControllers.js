import dotenv from "dotenv";
import jwt from 'jsonwebtoken';
import GatewayUserModel from "../models/gatewayUserModel.js"

dotenv.config();


export async function refreshTokenHandler(req, res) {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No refresh token provided",
      });
    }

    // Verify refresh token
    const payload = jwt.verify(token, process.env.SECRET_REFRESH_TOKEN);

    // Fetch user
    const user = await GatewayUserModel.findById(payload._id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Create new access token
    const newAccessToken = jwt.sign(
      // {
      //   userId: user._id,
      //   email: user.email,
      //   user_type: user.role,
      //   verified: user.verified,
      // },
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.SECRET_ACCESS_TOKEN,
      { expiresIn: "15m" }
    );
    console.log(newAccessToken)
    // Set new cookie
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      // maxAge: 15 * 60 * 1000, // 15 minutes
      maxAge: 20 * 24 * 60 * 60 * 1000, // 7 days
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