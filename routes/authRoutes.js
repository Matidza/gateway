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
  isUserloggedIn,
  oauthCallbackHandler,
  oauthCallbackHandlerForSignUpMentor,
  signUpAsInstitution,
  createMenteeUser,
  createMentorUser,
} from "../controllers/authControllers.js";

const router = express.Router();

// 🔐 AUTHENTICATION ROUTES
router.post("/signin", signIn);
router.post("/signout", signOut);
router.post("/createuser", createMenteeUser); // mentee
router.post("/createuserasprofessional", createMentorUser); // professional

router.post("/signup", signUp);
router.post("/signup-as-mentor", signUpAsMentor);
// router.post('/signup-as-company', catchAsync(signUpAsCompany));
router.post("/signup-as-institution", signUpAsInstitution);

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

// // Check if user is currently authenticated
// router.get('/check-auth', catchAsync(isUserloggedIn));

// // Google OAuth
// // For mentee signup
// router.get('/google', passport.authenticate('google', {
//   scope: ['profile', 'email'],
//   prompt: 'select_account',
//   state: 'mentee'
// }));
// router.get('/google/callback', passport.authenticate('google', { session: false }), oauthCallbackHandler);

// // Google Auth Mentor
// // For mentor signup
// router.get('/google-mentor', passport.authenticate('google', {
//   scope: ['profile', 'email'],
//   prompt: 'select_account',
//   state: 'mentor'
// }));
// router.get('/google/callback', passport.authenticate('google', { session: false }), oauthCallbackHandlerForSignUpMentor);

// // GitHub OAuth
// // For mentee signup
// router.get('/github', passport.authenticate('github', {
//   scope: ['user:email'],
//   state: 'mentee'
// }));
// router.get('/github/callback', passport.authenticate('github', { session: false }), oauthCallbackHandler);

// // GitHub OAuth
// // For mentor signup
// router.get('/github-mentor', passport.authenticate('github', {
//   scope: ['user:email'],
//   state: 'mentor'  // ✅ mark it as mentor signup
// }));

// router.get('/github/callback', passport.authenticate('github', { session: false }), oauthCallbackHandlerForSignUpMentor);

// // LinkedIn OAuth
// // 👤 Default signup (mentee)
// router.get('/linkedin', passport.authenticate('linkedin', {
//   state: 'mentee' // 🔐 passed to strategy
// }));
// router.get('/linkedin/callback', passport.authenticate('linkedin', { session: false }), oauthCallbackHandler);

// // 👨‍🏫 Mentor signup
// router.get('/linkedin-mentor', passport.authenticate('linkedin', {
//   state: 'mentor' // 🔐 passed to strategy
// }));
// router.get('/linkedin/callback', passport.authenticate('linkedin', { session: false }), oauthCallbackHandlerForSignUpMentor);

export default router;
