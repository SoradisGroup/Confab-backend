import axios from "axios";
import crypto from "crypto";

 

const BASE_URL =
  process.env.ICICI_BASE_URL || "https://uat-api.icicibank.com/orangepg";

const headers = {
  "Content-Type": "application/json",
  ClientId: process.env.ICICI_CLIENT_ID || "",
  ClientSecret: process.env.ICICI_CLIENT_SECRET || "",
};

const RETURN_URL = process.env.ICICI_RETURN_URL;

// ✅ Initiate Sale API
export const initiateSale = async (req, res) => {
  try {
    const {
      amount,
      customerEmailID,
      customerMobileNo,
      addlParam1,
      addlParam2,
    } = req.body;

    // Generate unique merchantTxnNo
    const merchantTxnNo = `TXN${Date.now()}`;

    // Current date in ICICI format YYYYMMDDHHMMSS
    const now = new Date();
    const txnDate =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    // Secure Hash generation
    const hashKey = `${addlParam1}${addlParam2}${amount}356${customerEmailID}${customerMobileNo}${process.env.ICICI_MERCHANT_ID}${merchantTxnNo}0${RETURN_URL}SALE${txnDate}`;

    const secureHash = crypto.createHash("sha256").update(hashKey).digest("hex");

    // Construct payload dynamically
    const payload = {
      merchantId: process.env.ICICI_MERCHANT_ID,
      merchantTxnNo,
      amount,
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

    // Call ICICI UAT InitiateSale API
    const response = await axios.post(
      `${BASE_URL}/initiateSale`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    // Send back redirectURI & tranCtx to frontend
    res.json({
      redirectURI: response.data.redirectURI,
      tranCtx: response.data.tranCtx,
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Payment initiation failed" });
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
