import express from "express";
import '../auth/passportConfig.js';
import catchAsync from '../utilities/catchAsync.js';
import authenticateToken from '../middlewares/identifier.js'
import { isUserloggedIn} from "../controllers/authControllers.js";
import { changePassword, sendForgotPasswordCode, verifysendForgotPasswordCode} from "../controllers/passwordControllers.js";

const router = express.Router();

// 🔑 PASSWORD MANAGEMENT
// Change password (requires login)
router.patch('/change-password', authenticateToken, catchAsync(changePassword));
router.patch('/forgot-password', catchAsync(sendForgotPasswordCode));
router.patch('/reset-password', catchAsync(verifysendForgotPasswordCode));

// Check if user is currently authenticated
router.get('/check-auth', catchAsync(isUserloggedIn));

export default router;
