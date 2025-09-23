import axios from "axios";
import https from "https";
import {
  generateSecureHash,
  generateTxnDate,
} from "../Utils/paymentFunctions.js";
import nodemailer from "nodemailer";
const BASE_URL =
  process.env.ICICI_BASE_URL || "https://uat-api.icicibank.com/orangepg";

const headers = {
  "Content-Type": "application/json",
  ClientId: process.env.ICICI_CLIENT_ID || "",
  ClientSecret: process.env.ICICI_CLIENT_SECRET || "",
};

const config = {
  merchantId: "T_03342",
  merchantSecretKey: "abc",
  baseURL: "https://qa.phicommerce.com",
  returnURL: "https://confab360degree.com/shipping", // Your Next.js callback page
};

export const intializePayment = async (req, res) => {
  try {
    const {
      amount,
      customerEmailID,
      customerMobileNo,
      merchantTxnNo,
      addlParam1 = "",
      addlParam2 = "",
    } = req.body;

    // Validate required fields
    if (!amount || !customerEmailID || !customerMobileNo || !merchantTxnNo) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const paymentData = {
      merchantId: config.merchantId,
      merchantTxnNo: merchantTxnNo,
      amount: parseFloat(amount).toFixed(2),
      currencyCode: "356",
      payType: "0", // Standard mode
      customerEmailID: customerEmailID,
      transactionType: "SALE",
      txnDate: generateTxnDate(),
      returnURL: config.returnURL,
      customerMobileNo: customerMobileNo,
      addlParam1: addlParam1,
      addlParam2: addlParam2,
    };

    // Generate secure hash
    paymentData.secureHash = generateSecureHash(paymentData);

    // Make API call to ICICI
    const response = await fetch(`${config.baseURL}/pg/api/v2/initiateSale`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();

    if (result.responseCode === "R1000") {
      return res.json({
        success: true,
        data: {
          redirectURI: result.redirectURI,
          tranCtx: result.tranCtx,
          merchantTxnNo: merchantTxnNo,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.responseDescription || "Payment initiation failed",
      });
    }
  } catch (error) {
    console.error("Payment initiation error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ✅ Status Check API
export const statusCheck = async (req, res) => {
  try {
    const response = await axios.post(`${BASE_URL}/statusCheck`, req.body, {
      headers,
    });
    return res.json(response.data);
  } catch (err) {
    console.error("❌ Status Check Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ✅ Payment Advice API (Callback from ICICI)
export const paymentAdvice = async (req, res) => {
  console.log("📩 Payment Advice Received:", req.body);

  // Here you should update your DB with transaction status
  return res.status(200).json({ message: "Advice received" });
};

// ✅ Settlement Advice API (Callback from ICICI)
export const settlementAdvice = async (req, res) => {
  console.log("📩 Settlement Advice Received:", req.body);

  // Here you should update your DB with settlement details
  return res.status(200).json({ message: "Settlement received" });
};
