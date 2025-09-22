import axios from "axios";
import type { Request, Response } from "express";
import crypto from "crypto";

const BASE_URL =
  process.env.ICICI_BASE_URL || "https://uat-api.icicibank.com/orangepg";

// ✅ Initiate Sale API
export const initiateSale = async (req: Request, res: Response) => {
  try {
    const {
      amount,
      customerEmailID,
      customerMobileNo,
      addlParam1 = "",
      addlParam2 = "",
    } = req.body;

    const MERCHANT_ID = process.env.ICICI_MERCHANT_ID!;
    const MERCHANT_SECRET = process.env.ICICI_MERCHANT_SECRET!;
    const RETURN_URL = process.env.ICICI_RETURN_URL!; // must match UAT registered URL

    const headers = {
      "Content-Type": "application/json",
      ClientId: MERCHANT_ID,
      ClientSecret: MERCHANT_SECRET,
    };

    // Generate unique merchantTxnNo
    const merchantTxnNo = `TXN${Date.now()}`;

    // txnDate in YYYYMMDDHHMMSS format
    const now = new Date();
    const txnDate =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    // Format amount exactly (2 decimals)
    const amountFormatted = Number(amount).toFixed(2);

    // Construct hash string in exact order
    const hashString = [
      addlParam1,
      addlParam2,
      amountFormatted,
      "356", // currencyCode INR
      customerEmailID,
      customerMobileNo,
      MERCHANT_ID,
      merchantTxnNo,
      "0", // payType
      RETURN_URL,
      "SALE",
      txnDate,
    ].join("|");

    // HMAC-SHA256 with merchant secret
    const secureHash = crypto
      .createHmac("sha256", MERCHANT_SECRET)
      .update(hashString)
      .digest("hex")
      .toLowerCase();

    console.log("Hash string before HMAC-SHA256:", hashString);
    console.log("Secure hash generated:", secureHash);

    // Payload to ICICI
    const payload = {
      merchantId: MERCHANT_ID,
      merchantTxnNo,
      amount: amountFormatted,
      currencyCode: "356",
      payType: "0",
      customerEmailID,
      customerMobileNo,
      transactionType: "SALE",
      txnDate,
      returnURL: RETURN_URL,
      addlParam1,
      addlParam2,
      secureHash,
    };

    // Call ICICI InitiateSale API
    const response = await axios.post(`${BASE_URL}/initiateSale`, payload, {
      headers,
    });

    console.log("Response from ICICI:", response.data);

    res.json({
      redirectUrl: response.data.redirectURI,
      tranCtx: response.data.tranCtx,
    });
  } catch (error: any) {
    console.error("Payment initiation failed:", error.response?.data || error.message);
    res.status(500).json({ error: "Payment initiation failed" });
  }
};

// ✅ Status Check API
export const statusCheck = async (req: Request, res: Response) => {
  const MERCHANT_ID = process.env.ICICI_MERCHANT_ID!;
  const MERCHANT_SECRET = process.env.ICICI_MERCHANT_SECRET!;
  const RETURN_URL = process.env.ICICI_RETURN_URL!;

  const headers = {
    "Content-Type": "application/json",
    ClientId: MERCHANT_ID || "",
    ClientSecret: MERCHANT_SECRET || "",
  };

  try {
    const response = await axios.post(`${BASE_URL}/statusCheck`, req.body, {
      headers,
    });
    return res.json(response.data);
  } catch (error: any) {
    console.error("❌ Status Check Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ✅ Payment Advice API (Callback from ICICI)
export const paymentAdvice = async (req: Request, res: Response) => {
  console.log("📩 Payment Advice Received:", req.body);

  // Here you should update your DB with transaction status
  return res.status(200).json({ message: "Advice received" });
};

// ✅ Settlement Advice API (Callback from ICICI)
export const settlementAdvice = async (req: Request, res: Response) => {
  console.log("📩 Settlement Advice Received:", req.body);

  // Here you should update your DB with settlement details
  return res.status(200).json({ message: "Settlement received" });
};
