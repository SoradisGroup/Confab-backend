import { Router } from "express";
import {
  checkStatus,
  HandlePaymentCallback,
  iciciReturnHandler,
  intializePayment,
  intializePaymentForNeat,
} from "../controllers/paymentController.js";

const router = Router();

// ICICI PG routes
router.post("/initiate", intializePayment);
router.post("/initiate/neat", intializePaymentForNeat);
router.post("/aicte", iciciReturnHandler);
router.post("/status", checkStatus);
router.post("/callback", HandlePaymentCallback); // Callback endpoint from ICICI

export default router;
