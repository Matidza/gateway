import crypto from "crypto";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

import UserModel from "../models/menteeModel.js";
import MentorModel from "../models/mentorModel.js";
import CompanyModel from "../models/companyModel.js";
import InstitutionModel from "../models/institutionModel.js";

import doHash, { decryptHashedPassword } from "../utilities/hashing.js";
import { signUpSchema, signInSchema } from "../validator/validators.js";

dotenv.config();



export const signUp = async (req, res) => {
  const { email, password, role = "mentee" } = req.body;

  try {
    // Step 1: Validate input
    const { error } = signUpSchema.validate({ email, password });
    if (error) {
      return res.status(400).json({
        field: error.details[0].context.key,
        success: false,
        message: error.details[0].message,
      });
    }

    // Step 2: Check if email exists across multiple models
    const models = [
      { name: "UserModel", model: UserModel },
      { name: "MentorModel", model: MentorModel },
      { name: "CompanyModel", model: CompanyModel },
      { name: "InstitutionModel", model: InstitutionModel },
    ];

    for (const { name, model } of models) {
      const userExists = await model.findOne({ email });
      if (userExists) {
        return res.status(409).json({
          field: "email",
          success: false,
          message: `Email already exists in ${name}. Try a different one.`,
        });
      }
    }

    // Step 3: Hash the password
    const hashedPassword = await doHash(password, 12);

    // Step 4: Create new user
    const newUser = new UserModel({
      email,
      password: hashedPassword,
      provider: "local",
      role,
    });
    const result = await newUser.save();

    result.password = undefined; // Remove password from response

    // Step 5: Send response
    return res.status(201).json({
      success: true,
      field: null,
      message: "🎉 Your account has been created successfully",
      userId: newUser._id,
      user_type: newUser.role,
      newUser: result,
    });
  } catch (error) {
    console.error("SignUp Error:", error);
    return res.status(500).json({
      field: null,
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};
export default signUp;

export const signUpAsMentor = async (req, res) => {
  const { email, password, role = "mentor" } = req.body;

  try {
    // Step 1: Validate input
    const { error } = signUpSchema.validate({ email, password });
    if (error) {
      return res.status(400).json({
        field: error.details[0].context.key,
        success: false,
        message: error.details[0].message,
      });
    }

    // Step 2: Check if email exists across multiple models
    const models = [
      { name: "UserModel", model: UserModel },
      { name: "MentorModel", model: MentorModel },
      { name: "CompanyModel", model: CompanyModel },
      { name: "InstitutionModel", model: InstitutionModel },
    ];

    for (const { name, model } of models) {
      const userExists = await model.findOne({ email });
      if (userExists) {
        return res.status(409).json({
          field: "email",
          success: false,
          message: `Email already exists in ${name}. Try a different one.`,
        });
      }
    }

    // Step 3: Hash the password
    const hashedPassword = await doHash(password, 12);

    // Step 4: Create new mentor
    const newUser = new MentorModel({
      role,
      email,
      password: hashedPassword,
      provider: "local",
    });
    const result = await newUser.save();

    result.password = undefined; // Remove password before sending back

    // Step 5: Send response
    return res.status(201).json({
      success: true,
      field: null,
      message: "🎉 Your mentor account has been created successfully",
      userId: newUser._id,
      user_type: newUser.role,
      newUser: result,
    });
  } catch (error) {
    console.error("SignUpAsMentor Error:", error);
    return res.status(500).json({
      field: null,
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};



export const oauthCallbackHandler = async (req, res) => {
  const { id, email, name, provider, role = "mentee" } = req.user;

  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email not found in OAuth profile",
      });
    }

    // Step 1: Check if email exists across multiple models
    const models = [
      { name: "UserModel", model: UserModel },
      { name: "MentorModel", model: MentorModel },
      { name: "CompanyModel", model: CompanyModel },
      { name: "InstitutionModel", model: InstitutionModel },
    ];

    for (const { name, model } of models) {
      const userExists = await model.findOne({ email });
      if (userExists) {
        // ✅ If found, just return success and don't create duplicate
        return res.status(200).json({
          success: true,
          field: null,
          message: `Welcome back! You already have an account in ${name}.`,
          userId: userExists._id,
          user_type: userExists.role,
          user: userExists,
        });
      }
    }

    // Step 2: If not found, create a new user in UserModel
    const newUser = await UserModel.create({
      email,
      name,
      provider,
      oauthId: id,
      role,
      password: crypto.randomBytes(16).toString("hex"), // random password since OAuth handles login
    });

    // Remove password from response
    newUser.password = undefined;

    // Step 3: Respond and redirect
    return res.status(201).json({
      success: true,
      field: null,
      message: "🎉 Your account has been created successfully via OAuth",
      userId: newUser._id,
      user_type: newUser.role,
      newUser,
    });

    // If you want redirect after JSON response, send token then redirect on frontend
    // res.redirect("http://localhost:3000/AUTH_MICROSERVICE/signin");
  } catch (error) {
    console.error("OAuth Error:", error);
    return res.status(500).json({
      success: false,
      message: "OAuth Login failed. Please try again.",
    });
  }
};

export const oauthCallbackHandlerForSignUpMentor = async (req, res) => {
  const { id, email, name, provider, role = "mentor" } = req.user;

  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email not found in OAuth profile",
      });
    }

    // Step 1: Check if email exists across multiple models
    const models = [
      { name: "UserModel", model: UserModel },
      { name: "MentorModel", model: MentorModel },
      { name: "CompanyModel", model: CompanyModel },
      { name: "InstitutionModel", model: InstitutionModel },
    ];

    for (const { name, model } of models) {
      const userExists = await model.findOne({ email });
      if (userExists) {
        return res.status(200).json({
          success: true,
          field: null,
          message: `Welcome back! You already have an account in ${name}.`,
          userId: userExists._id,
          user_type: userExists.role,
          user: userExists,
        });
      }
    }

    // Step 2: If not found, create a new mentor user
    const newUser = await MentorModel.create({
      email,
      name,
      provider,
      oauthId: id,
      role,
      password: crypto.randomBytes(16).toString("hex"), // random password for OAuth
    });

    // Remove password before sending response
    newUser.password = undefined;

    // Step 3: Respond (✅ either redirect OR send JSON, not both)
    return res.status(201).json({
      success: true,
      field: null,
      message: "🎉 Your mentor account has been created successfully via OAuth",
      userId: newUser._id,
      user_type: newUser.role,
      newUser,
    });

    // OR if you really want redirect instead of JSON:
    // return res.redirect("http://localhost:3000/AUTH_MICROSERVICE/signin");
  } catch (error) {
    console.error("OAuth Mentor Signup Error:", error);
    return res.status(500).json({
      success: false,
      message: "OAuth Login failed. Please try again.",
    });
  }
};

export async function signIn(req, res) {
  const { email, password } = req.body;

  try {
    // Step 1: Validate input
    const { error } = signInSchema.validate({ email, password });
    if (error) {
      return res.status(400).json({
        success: false,
        field: error.details[0].context.key,
        message: error.details[0].message,
      });
    }

    // Step 2: Find user across multiple models
    let existingUser = null;
    let role = null;

    for (const [type, model] of Object.entries({
      user: UserModel,
      mentor: MentorModel,
      company: CompanyModel,
      institution: InstitutionModel,
    })) {
      const found = await model.findOne({ email }).select("+password");
      if (found) {
        existingUser = found;
        role = type;
        break;
      }
    }

    if (!existingUser) {
      return res.status(401).json({
        success: false,
        field: "email",
        message: "User doesn't exist. Please sign up.",
      });
    }

    // Step 3: Check password
    const isPasswordValid = await decryptHashedPassword(
      password,
      existingUser.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        field: "password",
        message: "Invalid password",
      });
    }

    // Step 4: Generate tokens
    const accessToken = jwt.sign(
      {
        userId: existingUser._id,
        email: existingUser.email,
        user_type: existingUser.role, // use detected userType
      },
      process.env.SECRET_ACCESS_TOKEN,
      { expiresIn: "60m" } // short-lived
    );


    const refreshToken = jwt.sign(
      { userId: existingUser._id },
      process.env.SECRET_REFRESH_TOKEN,
      { expiresIn: "7d" } // long-lived
    );

    // Step 5: Set cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Step 6: Send response
    res.json({
      success: true,
      message: "Logged in successfully",
      userId: existingUser._id,
      user_type: existingUser.role,
      email: existingUser.email,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });

    // console.log(
    //   `\nUser: ${existingUser._id}\nType: ${existingUser.user_type}\nAccessToken: ${accessToken}\nRefreshToken: ${refreshToken}`
    // );
  } catch (error) {
    console.error("SignIn Error:", error);
    res.status(500).json({
      success: false,
      message: `Internal server error: ${error.message || error}`,
    });
  }
}

export async function signOut(req, res) {
  res
    .clearCookie("accessToken", "refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    })
    .clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    }); //.redirect("http://localhost:3000/AUTH_MICROSERVICE/signup");

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}
