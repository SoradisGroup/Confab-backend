import { Router } from "express";
import { sendContactEmail } from "../controllers/contactController.ts";


const router = Router();

// POST /api/career
router.post("/sendMail", sendContactEmail);

export default router;