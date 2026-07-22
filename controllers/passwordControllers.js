import dotenv from "dotenv";
import sendEmail from "../middlewares/sendEmail.js";

import UserModel from "../models/userModel.js";
import MentorModel from "../models/mentorModel.js";
import CompanyModel from "../models/companyModel.js";
import InstitutionModel from "../models/institutionModel.js";

import doHash, {decryptHashedPassword,hmacProcess,} from "../utilities/hashing.js";
import {changePasswordSchema, acceptForgotPasswordSchema, sendCodeSchema,} from "../middlewares/validators.js";


dotenv.config();


export const changePassword = async (req, res) => {
  const { userId } = req.user;
  const { oldPassword, newPassword } = req.body;

  try {
    // ✅ 1. Validate input
    const { error } = changePasswordSchema.validate({ oldPassword, newPassword });
    if (error) {
      return res.status(400).json({
        field: error.details[0].context.key,
        success: false,
        message: error.details[0].message,
      });
    }

    // ✅ 2. Find user across multiple models
    const models = [
      { name: "UserModel", model: UserModel },
      { name: "MentorModel", model: MentorModel },
      { name: "CompanyModel", model: CompanyModel },
      { name: "InstitutionModel", model: InstitutionModel }
    ];

    let existingUser = null;
    for (const { name, model } of models) {
      try {
        existingUser = await model.findById(userId).select("+password");
        if (existingUser) {
          console.log(`✅ Found user in ${name}`);
          break;
        }
      } catch (err) {
        console.error(`❌ Error querying ${name}:`, err.message);
      }
    }

    if (!existingUser) {
      return res.status(404).json({
        field: "user",
        success: false,
        message: "User doesn't exist",
      });
    }

    // ✅ 3. Check old password
    const isMatch = await decryptHashedPassword(oldPassword, existingUser.password);
    
    if (!isMatch) {
      return res.status(401).json({
        field: "oldPassword",
        success: false,
        message: "Old password is incorrect",
      });
    }
    if (isMatch) {
      if (oldPassword === newPassword) {
        return res.status(401).json({
          field: "oldPassword",
          success: false,
          message: "New password matches the old password, try a different one",
        });
      } else {
        // ✅ 4. Hash and update new password
        existingUser.password = await doHash(newPassword, 12);
        await existingUser.save();

        return res.status(200).json({
          success: true,
          message: "🔒 Password updated successfully",
        });
      }
    }
  } catch (error) {
    console.error("❌ changePassword Error:", error);
    return res.status(500).json({
      success: false,
      field: null,
      message: "Internal server error",
    });
  }
};

export async function sendForgotPasswordCode(req, res) {
  const { email } = req.body;

  try {
    // Step 1: Validate input
    const { error } = sendCodeSchema.validate({ email });
    if (error) {
      return res.status(400).json({
        field: error.details[0].context.key,
        success: false,
        message: error.details[0].message,
      });
    }

    // Step 2: Search across multiple models
    const models = [
      { name: "UserModel", model: UserModel },
      { name: "MentorModel", model: MentorModel },
      { name: "CompanyModel", model: CompanyModel },
      { name: "InstitutionModel", model: InstitutionModel }
    ];

    let existingUser = null;
    for (const { name, model } of models) {
      try {
        existingUser = await model.findOne({ email });
        if (existingUser) {
          console.log(`✅ Found user in ${name}`);
          break;
        }
      } catch (err) {
        console.error(`❌ Error querying ${name}:`, err.message);
      }
    }

    if (!existingUser) {
      return res.status(404).json({
        field: "email",
        success: false,
        message: "User doesn't exist",
      });
    }

    // Step 3: Generate reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Reset Code:", resetCode);

    // Step 4: Send email
    const sendingEmail = await sendEmail.sendMail({
      from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
      to: existingUser.email,
      subject: 'Forgot Your Password – Verification Code Inside',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="text-align: center; color: #24292e;">Password Reset Request</h2>
            <p>Hello ${existingUser.email || ''},</p>
            <p>We received a request to reset your password. Use the verification code below to proceed:</p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 36px; font-weight: bold; color: #4CAF50;">${resetCode}</span>
            </div>
            <p style="text-align: center;">
                <a href="http://localhost:3000/verify-reset-code?email=${existingUser.email}"
                   style="display: inline-block; padding: 12px 24px; background-color: #2ea44f; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Verify Code
                </a>
            </p>
            <p><strong>Note:</strong> This code will expire in 5 minutes. If you didn’t request this, you can safely ignore this email.</p>
            <p>Thanks,<br>The Support Team</p>
        </div>
      `
    });

    if (sendingEmail.accepted[0] === existingUser.email) {
      // Step 5: Save hashed reset code
      const hashedValue = hmacProcess(resetCode, process.env.HMAC_VERIFICATION_CODE_SECRET);
      existingUser.forgotPasswordCode = hashedValue;
      existingUser.forgotPasswordCodeValidation = Date.now();
      await existingUser.save();

      return res.status(200).json({
        success: true,
        field: null,
        message: `Code sent to your ${existingUser.email}`,
        code: resetCode // For testing only
      });
    }

    return res.status(500).json({
      success: false,
      field: null,
      message: "Failed to send the verification code",
    });

  } catch (error) {
    console.error("❌ sendForgotPasswordCode Error:", error);
    return res.status(500).json({
      success: false,
      field: null,
      message: "Internal server error",
    });
  }
}

export async function verifysendForgotPasswordCode(req, res) {
  const { email, providedCodeValue, newPassword } = req.body;

  try {
    // Step 1: Validate input
    const { error } = acceptForgotPasswordSchema.validate({ email, providedCodeValue, newPassword });
    if (error) {
      return res.status(400).json({
        success: false,
        field: error.details[0].context.key,
        message: error.details[0].message,
      });
    }

    // Step 2: Search across multiple models
    const models = [
      { name: "UserModel", model: UserModel },
      { name: "MentorModel", model: MentorModel },
      { name: "CompanyModel", model: CompanyModel },
      { name: "InstitutionModel", model: InstitutionModel },
    ];

    let existingUser = null;
    for (const { name, model } of models) {
      try {
        existingUser = await model.findOne({ email }).select('+forgotPasswordCode +forgotPasswordCodeValidation +password');
        if (existingUser) {
          console.log(`✅ Found user in ${name}`);
          break;
        }
      } catch (err) {
        console.error(`❌ Error querying ${name}:`, err.message);
      }
    }

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        field: 'email',
        message: "User doesn't exist",
      });
    }

    // Step 3: Check if reset code exists
    if (!existingUser.forgotPasswordCode || !existingUser.forgotPasswordCodeValidation) {
      return res.status(400).json({
        success: false,
        field: null,
        message: "Reset code not found. Please request a new one.",
      });
    }

    // Step 4: Expiry check (5 minutes)
    if (Date.now() - existingUser.forgotPasswordCodeValidation > 5 * 60 * 1000) {
      return res.status(401).json({
        success: false,
        field: null,
        message: "Code has expired! Please request a new one.",
      });
    }

    // Step 5: Hash and compare code
    if (!process.env.HMAC_VERIFICATION_CODE_SECRET) {
      console.error("❌ HMAC secret missing in .env");
      return res.status(500).json({
        success: false,
        field: null,
        message: "Server configuration error",
      });
    }

    const hashedCode = hmacProcess(providedCodeValue.toString(), process.env.HMAC_VERIFICATION_CODE_SECRET);

    if (hashedCode !== existingUser.forgotPasswordCode) {
      return res.status(400).json({
        success: false,
        field: 'providedCodeValue',
        message: "Invalid code",
      });
    }

    // Step 6: Update password
    existingUser.password = await doHash(newPassword, 12);
    existingUser.forgotPasswordCode = undefined;
    existingUser.forgotPasswordCodeValidation = undefined;
    await existingUser.save();

    return res.status(200).json({
      success: true,
      field: null,
      message: "Password reset was successful!",
    });

  } catch (err) {
    console.error("❌ verifysendForgotPasswordCode Error:", err);
    return res.status(500).json({
      success: false,
      field: null,
      message: "Internal server error",
    });
  }
}