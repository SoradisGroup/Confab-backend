import { Router } from "express";
import { initiateSale, paymentAdvice, settlementAdvice, statusCheck } from "../controllers/paymentController.ts";


const router = Router();

// ICICI PG routes
router.post("/initiate", initiateSale);
router.post("/status", statusCheck);
router.post("/advice", paymentAdvice);   // Callback endpoint from ICICI
router.post("/settlement", settlementAdvice); // Callback endpoint from ICICI

export default router;
