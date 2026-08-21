import express from "express";
import { createUser, logout } from "../controllers/authControllers.js";

const router = express.Router();

// 🔐 AUTHENTICATION ROUTES
router.post("/create-user", createUser);
router.post("/logout", logout);


export default router;
