import express from "express";
import Redis from "ioredis";

import { Profesionals } from "../controllers/menteeController.js";
import {
  bookSession, cancelSession, 
  createMenteeProfile, deleteMenteeprofile, 
  individualBookPage, menteeDashboard, 
  updateMenteeProfile,viewMenteeProfile,
  aiInterviewHome, interviews,  getAIInterviews,
  getSingleAIInterview, createAIInterview,
  getCommunityAIInterviews, getMyAIInterviews
} from "../controllers/menteeController.js";

import { authorize } from "../middlewares/authorization.js";
import { menteeRateLimiter } from "../middlewares/rateLimit.js";
import authenticateToken from "../../mentee-service/middlewares/authenticateTokenFromAuthMicroservice.js";

const router = express.Router();


router.get("/dashboard",menteeRateLimiter({limit: 100, window: 120}), menteeDashboard)// // rate limit cache
router.get("/ai-home", aiInterviewHome) // rate limit cache
router.post("/ai-home/create", createAIInterview) // rate limit cache
router.get("/community-interviews", getCommunityAIInterviews) // rate limit cache
// router.get("/community-interviews", getAIInterviews) // rate limit cache
router.get("/my-interviews", getMyAIInterviews) // rate limit cache
router.get("/practice-details", getSingleAIInterview) // rate limit cache
router.get("/interviews", interviews) // rate limit cache
router.get("/profesionals", Profesionals) // rate limit cache
router.get("/professional-details", individualBookPage)// rate limit, cache

// booking a session with a mentor
router.post("/book-a-session", authenticateToken, authorize("mentee"), bookSession) // bok a session with a mentor
router.get("/cancel-session", authenticateToken, authorize("mentee"), cancelSession)



router.post("/create", authenticateToken, authorize("mentee"), menteeRateLimiter({limit: 50, window: 9990}), createMenteeProfile)// rate limit
router.get("/profile", authenticateToken, authorize("mentee"), menteeRateLimiter({limit: 1000, window: 3600}), viewMenteeProfile)// rate limit cache
router.patch("/update", authenticateToken, authorize("mentee"), menteeRateLimiter({limit: 100, window: 90}), updateMenteeProfile) // rate limit
router.delete("/delete", authenticateToken, authorize("mentee"), menteeRateLimiter({limit: 2, window: 90}), deleteMenteeprofile)

// mento profiles on the dashboard



export default router