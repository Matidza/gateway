import dotenv from "dotenv";
import sendEmail from "../middlewares/sendEmail.js";
import { SERVICE_URLS } from "../config/services.js";
import GatewayUserModel from "../models/gatewayUserModel.js";
import { callInternalService } from "../utilities/internalServiceClient.js";
import { generateAccessToken, generateRefreshToken } from "../utilities/jwt.js";



dotenv.config();


export const logout = async (req, res) => {
  try {
    // Optional: remove the refresh token from the database
    if (req.user?.id) {
      await GatewayUserModel.findByIdAndUpdate(req.user.id, {
        $unset: { refreshToken: "" },
      });
    }

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




/* ────────────────────────────────────────
          SENT EMAIL TO NEW USERS
─────────────────────────────────────────── */



const PROVISIONING_ENDPOINTS = {
  mentee: `${SERVICE_URLS.mentee}/internal/profiles`,
};

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// --- inTurn brand tokens (matches Home.tsx / aihome.tsx) --------------------
const P    = "#7F42E7"; // primary purple
const PD   = "#5E2EC5"; // primary purple, darker (hover/accent)
const PL   = "#F0EAFD"; // primary purple, light bg
const INK  = "#0D0D12"; // headings
const INK2 = "#4A4A5A"; // body text
const INK3 = "#8A8AA0"; // muted/footer text
const BORDER = "#E8E3F5";
const OFF = "#F7F6FC"; // page bg
const WHITE = "#FFFFFF";

// Role-specific first stop after signup, so the CTA button lands the
// person somewhere useful instead of a generic homepage.
const PORTAL_PATH_BY_ROLE = {
  mentee: "/mentee/dashboard",
  professional: "/professional/dashboard",
  company: "/company/dashboard",
};

/**
 * Builds the welcome email HTML. Uses table-based layout and inline
 * styles throughout (no <style> block, no flex/grid) since that's what
 * reliably renders across Gmail/Outlook/Apple Mail — the same reason
 * email.js's reset-code email does the same.
 */
const buildWelcomeEmailHtml = (user) => {
  const firstName = (user.name || "there").split(" ")[0];
  const ctaPath = PORTAL_PATH_BY_ROLE[user.role] || "/dashboard";

  return `
  <div style="background:${OFF};padding:32px 16px;font-family:'DM Sans',Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:${WHITE};border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,${P},${PD});padding:32px 32px 28px;text-align:center;">
        <span style="display:inline-block;font-family:Georgia,serif;font-weight:700;font-size:22px;color:${WHITE};letter-spacing:-0.02em;">
          inTurn
        </span>
      </div>

      <!-- Body -->
      <div style="padding:32px;">
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:${INK};letter-spacing:-0.01em;">
          Welcome, ${firstName} 👋
        </h1>
        <p style="margin:0 0 20px;font-size:14.5px;line-height:1.7;color:${INK2};">
          Your inTurn account is ready. Whether it's AI-powered mock interviews, real sessions with
          industry professionals, or sharpening your CV, we're here to help you land the role you're
          working toward.
        </p>

        <div style="text-align:center;margin:28px 0;">
          <a href="${FRONTEND_URL}${ctaPath}"
             style="display:inline-block;padding:13px 28px;background:${P};color:${WHITE};
                    text-decoration:none;border-radius:100px;font-weight:600;font-size:14px;">
            Go to your dashboard
          </a>
        </div>

        <div style="background:${PL};border-radius:12px;padding:18px 20px;margin-top:8px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${P};">Getting started</p>
          <p style="margin:0;font-size:13px;line-height:1.7;color:${INK2};">
            Start an AI mock interview, book time with a professional, or run your CV through our
            analyzer — your dashboard has all three one click away.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:20px 32px 28px;border-top:1px solid ${BORDER};text-align:center;">
        <p style="margin:0;font-size:12px;color:${INK3};">
          You're receiving this because an account was just created with this email at inTurn.
        </p>
      </div>
    </div>
  </div>
  `;
};

const sendWelcomeEmail = async (user) => {
  const html = buildWelcomeEmailHtml(user);
  const result = await sendEmail.sendMail({
    from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
    to: user.email,
    subject: "Welcome to inTurn 🎉",
    html,
  });

  if (result.accepted?.[0] !== user.email) {
    throw new Error("Email provider did not accept the welcome email");
  }
};

export const createUser = async (req, res) => {
  const { name, email, avatar, role, email_verified } = req.body;

  try {
    let user = await GatewayUserModel.findOne({ email });
    const isNewUser = !user;

    // If this Google account already exists under a different role than
    // the one selected on the login screen, do NOT create a second
    // account or switch their role. Log them into their real account and
    // flag the mismatch so the frontend can tell them, instead of
    // silently treating "professional" as if it were their role.
    const roleMismatch = !isNewUser && role && user.role !== role;

    if (!user) {
      user = await GatewayUserModel.create({ name, email, avatar, role, email_verified });
    }

    // Provisioning + welcome email stay exactly as they are — both are
    // already gated on isNewUser, so a roleMismatch login (which is by
    // definition an existing user) never re-triggers either of them.
    const provisioningUrl = PROVISIONING_ENDPOINTS[role];
    if (isNewUser && provisioningUrl) {
      try {
        await callInternalService(provisioningUrl, {
          userId: user._id,
          name: user.name,
          email: user.email,
        });
      } catch (provisionErr) {
        console.error(
          `❌ Failed to provision ${role} profile for user ${user._id}:`,
          provisionErr.message
        );
      }
    }

    if (isNewUser) {
      sendWelcomeEmail(user).catch((emailErr) => {
        console.error(`❌ Failed to send welcome email to ${user.email}:`, emailErr.message);
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000, // 15 minutes, matching the token's actual expiry
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 20 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: roleMismatch
        ? `You already have an account registered as a ${user.role}.`
        : "Logged in successfully",
      roleMismatch,
      user, // always the real DB user — user.role is the source of truth
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
