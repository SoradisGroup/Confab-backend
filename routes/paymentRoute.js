import { Router } from "express";
import {
  intializePayment,
  paymentAdvice,
  settlementAdvice,
  statusCheck,
} from "../controllers/paymentController.js";

const router = Router();

// ICICI PG routes
router.post("/initiate", intializePayment);
router.post("/status", statusCheck);
router.post("/advice", paymentAdvice); // Callback endpoint from ICICI
router.post("/settlement", settlementAdvice); // Callback endpoint from ICICI

export default router;
