import { Router } from "express";
import { sendCareerEmail } from "../controllers/careerController.ts";


const router = Router();

// POST /api/career
router.post("/sendMail", sendCareerEmail);

export default router;