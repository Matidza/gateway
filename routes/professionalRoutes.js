import express from "express";
import { authorize } from "../middlewares/authorization.js";
import { professionalRateLimiter } from "../middlewares/rateLimit.js";
import authenticateToken from "../middlewares/authenticateTokenFromAuthMicroservice.js";
import mentorDashboard, {createMentorProfile,deleteProfile, updateProfile, viewProfile} from "../controllers/professionalController.js";


const router = express.Router();

// rate limit these endpoints
router.get("/dashboard", authenticateToken,authorize("mentor"), professionalRateLimiter({ limit: 100, window: 30 }), mentorDashboard)

//profile related routes
router.post("/create", authenticateToken,authorize("mentor"), professionalRateLimiter({ limit: 1, window: 30 }), createMentorProfile)
router.get("/profile", authenticateToken,authorize("mentor"), professionalRateLimiter({limit: 100, wimdow: 6000}), viewProfile)
router.patch("/update", authenticateToken,authorize("mentor"), professionalRateLimiter({limit: 50, wimdow: 600}), updateProfile)
router.delete("/delete", authenticateToken,authorize("mentor"), professionalRateLimiter({limit: 50, wimdow: 600}), deleteProfile)


export default router;