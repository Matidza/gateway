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

export const createMenteeUser = async (request, response) => {
  try {
    const { name, email, avatar, user_type = "mentee" } = request.body;

    const userExists = await UserModel.findOne({ email });

    if (userExists) {
      // create Access and refresh Tokens when user LogsIn and send via cookies
      // Step 4: Generate tokens
      const accessToken = jwt.sign(
        {
          user: userExists._id,
          name: userExists.name,
          email: userExists.email,
          user_type: userExists.user_type, // use detected userType
        },
        process.env.SECRET_ACCESS_TOKEN,
        { expiresIn: "60m" } // short-lived
      );
      const refreshToken = jwt.sign(
        { userId: userExists._id },
        process.env.SECRET_REFRESH_TOKEN,
        { expiresIn: "7d" } // long-lived
      );

      // Step 5: Set cookies
      response.cookie("accessToken", accessToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });
      response.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return response.status(200).json({
        success: true,
        message: `🎉 Login was successfully.Welcome back to Qasar ${userExists.email}`,
        result: userExists,
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
    } 
    
    // If user doesnt exists
    const newUser = await UserModel.create({
      name,
      email,
      avatar,
      user_type,
    });
    // create Access and refresh Tokens when user LogsIn and send via cookies
    // Step 4: Generate tokens
    const accessToken = jwt.sign(
      {
        user: newUser._id,
        name: newUser.name,
        email: newUser.email,
        user_type: newUser.user_type, // use detected userType
      },
      process.env.SECRET_ACCESS_TOKEN,
      { expiresIn: "60m" } // short-lived
    );
    const refreshToken = jwt.sign(
      { userId: newUser._id },
      process.env.SECRET_REFRESH_TOKEN,
      { expiresIn: "7d" } // long-lived
    );

    // Step 5: Set cookies
    response.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    response.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    response.status(201).json({
      success: true,
      message: `🎉 Your account has been created successfully.Welcome to Qasar ${newUser.email}`,
      result: newUser,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createMentorUser = async (request, response) => {
  try {
    const { name, email, avatar, user_type = "mentor" } = request.body;

    const userExists = await MentorModel.findOne({ email });

    if (userExists) {
      // create Access and refresh Tokens when user LogsIn and send via cookies
      // Step 4: Generate tokens
      const accessToken = jwt.sign(
        {
          user: userExists._id,
          name: userExists.name,
          email: userExists.email,
          user_type: userExists.user_type, // use detected userType
        },
        process.env.SECRET_ACCESS_TOKEN,
        { expiresIn: "60m" } // short-lived
      );
      const refreshToken = jwt.sign(
        { userId: userExists._id },
        process.env.SECRET_REFRESH_TOKEN,
        { expiresIn: "7d" } // long-lived
      );

      // Step 5: Set cookies
      response.cookie("accessToken", accessToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });
      response.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return response.status(200).json({
        success: true,
        message: `🎉 Login was successfully.Welcome back to Qasar ${userExists.email}`,
        result: userExists,
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
    } 

    const newUser = await MentorModel.create({
      name,
      email,
      avatar,
      user_type,
    });

    // Step 4: Generate tokens
    const accessToken = jwt.sign(
      {
        user: newUser._id,
        name: newUser.name,
        email: newUser.email,
        user_type: newUser.user_type, // use detected userType
      },
      process.env.SECRET_ACCESS_TOKEN,
      { expiresIn: "60m" } // short-lived
    );
    const refreshToken = jwt.sign(
      { userId: newUser._id },
      process.env.SECRET_REFRESH_TOKEN,
      { expiresIn: "7d" } // long-lived
    );

    // Step 5: Set cookies
    response.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    response.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });


    response.status(201).json({
      success: true,
      message: `🎉 Your account has been created successfully.Welcome to Qasar ${newUser.email}`,
      result: newUser
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const signUp = async (req, res) => {
  const { email, password, user_type = "mentee" } = req.body;

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
      user_type,
    });
    const result = await newUser.save();

    result.password = undefined; // Remove password from response

    // Step 5: Send response
    return res.status(201).json({
      success: true,
      field: null,
      message: "🎉 Your account has been created successfully",
      userId: newUser._id,
      user_type: newUser.user_type,
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
  const { email, password, user_type = "mentor" } = req.body;

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
      user_type,
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
      user_type: newUser.user_type,
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

export const signUpAsInstitution = async (req, res) => {
  const { email, password, user_type = "institution" } = req.body;

  try {
    // Step 1: Validate user input
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

    // Step 3: Hash password
    const hashedPassword = await doHash(password, 12);

    // Step 4: Create institution user
    const newUser = new InstitutionModel({
      email,
      user_type,
      password: hashedPassword,
      provider: "local",
    });
    const result = await newUser.save();

    // Step 5: Remove password before sending response
    result.password = undefined;

    // Step 6: Send response
    return res.status(201).json({
      success: true,
      field: null,
      message: "🎉 Your institution account has been created successfully",
      userId: newUser._id,
      user_type: newUser.user_type,
      newUser: result,
    });
  } catch (error) {
    console.error("SignUpAsInstitution Error:", error);
    return res.status(500).json({
      field: null,
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

export function isUserloggedIn(req, res) {
  res.status(200).json({
    success: true,
    user: {
      id: req.user.userId,
      email: req.user.email,
      verified: req.user.verified,
    },
  });
}

export const oauthCallbackHandler = async (req, res) => {
  const { id, email, name, provider, user_type = "mentee" } = req.user;

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
          user_type: userExists.user_type,
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
      user_type,
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
      user_type: newUser.user_type,
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
  const { id, email, name, provider, user_type = "mentor" } = req.user;

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
          user_type: userExists.user_type,
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
      user_type,
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
      user_type: newUser.user_type,
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
    let user_type = null;

    for (const [type, model] of Object.entries({
      user: UserModel,
      mentor: MentorModel,
      company: CompanyModel,
      institution: InstitutionModel,
    })) {
      const found = await model.findOne({ email }).select("+password");
      if (found) {
        existingUser = found;
        user_type = type;
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
        user_type: existingUser.user_type, // use detected userType
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
      user_type: existingUser.user_type,
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
