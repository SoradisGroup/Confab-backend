import { Router } from "express";
import {
  intializePayment,
} from "../controllers/paymentController.js";

const router = Router();

// ICICI PG routes
router.post("/initiate", intializePayment);
router.post("/status", checkStatus);
router.post("/callback", HandlePaymentCallback); // Callback endpoint from ICICI

export default router;
