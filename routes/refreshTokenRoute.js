// External modules
import express from "express";
import { refreshTokenHandler,} from "../controllers/refreshControllers.js";

const router = express.Router();

router.post('/get-new-access-token', refreshTokenHandler);

export default router;