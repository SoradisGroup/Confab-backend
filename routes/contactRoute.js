import { Router } from "express";
import { sendContactEmail } from "../controllers/contactController.js";

const router = Router();

// POST /api/career
router.post("/sendMail", sendContactEmail);

export default router;
