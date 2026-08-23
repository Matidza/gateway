// External modules
import express from "express";
import { refreshTokenHandler,} from "../controllers/refreshControllers.js";

const router = express.Router();

router.post('/', refreshTokenHandler);

export default router;