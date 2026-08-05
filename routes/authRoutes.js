import express from "express";
// import passport from "passport";
// import '../auth/passportConfig.js';

import UserModel from "../models/menteeModel.js";
import CompanyModel from "../models/companyModel.js";
import MentorModel from "../models/mentorModel.js";
import {
  signUp,
  signUpAsMentor,
  signIn,
  signOut,
} from "../controllers/authControllers.js";

const router = express.Router();

// 🔐 AUTHENTICATION ROUTES
router.post("/signin", signIn);
router.post("/signout", signOut);

router.post("/signup", signUp);
router.post("/signup-as-mentor", signUpAsMentor);
// router.post('/signup-as-company', catchAsync(signUpAsCompany));
// router.post("/signup-as-institution", signUpAsInstitution);

router.post("/users/batch", async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        message: "userIds must be an array",
      });
    }

    // Fetch users from all collections in parallel
    const [users, companies, mentors] = await Promise.all([
      UserModel.find({ _id: { $in: userIds } }).select("email user_type"),
      CompanyModel.find({ _id: { $in: userIds } }).select("email user_type"),
      MentorModel.find({ _id: { $in: userIds } }).select("email user_type"),
    ]);

    // Merge all results
    const allUsers = [...users, ...companies, ...mentors];

    // Remove duplicates (in case some IDs overlap)
    const uniqueUsers = Array.from(
      new Map(allUsers.map((user) => [user._id.toString(), user])).values()
    );

    res.json(uniqueUsers);
  } catch (error) {
    console.error("Error in /api/users/batch:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});



export default router;
