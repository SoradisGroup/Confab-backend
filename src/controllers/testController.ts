import type { Request, Response } from "express";
import crypto from "crypto";

// Configuration
const config = {
  merchantId: "T_03342",
  merchantSecretKey: "abc",
  baseURL: "https://qa.phicommerce.com",
  returnURL: "http://localhost:3000/success", // Your Next.js callback page
};

// Generate secure hash using HMAC SHA256
function generateSecureHash(data: Record<string, any>) {
  const sortedKeys = Object.keys(data).sort();
  const hashString = sortedKeys
    .filter(
      (key) => data[key] !== null && data[key] !== undefined && data[key] !== ""
    )
    .map((key) => data[key])
    .join("");

  const hmac = crypto.createHmac("sha256", config.merchantSecretKey);
  hmac.update(hashString);
  return hmac.digest("hex").toLowerCase();
}

// Generate transaction date in required format
function generateTxnDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}
type PaymentData = {
  merchantId: string;
  merchantTxnNo: any;
  amount: string;
  currencyCode: string;
  payType: string;
  customerEmailID: any;
  transactionType: string;
  txnDate: string;
  returnURL: string;
  customerMobileNo: any;
  addlParam1: any;
  addlParam2: any;
  secureHash?: string;
};
// Initialize payment
export const intializePayment = async (req: Request, res: Response) => {
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

    const paymentData: PaymentData = {
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

// Handle payment callback (This will receive form POST from ICICI)
export const HandlePaymentCallback = (req: Request, res: Response) => {
  try {
    const callbackData = req.body;

    // Verify secure hash
    const receivedHash = callbackData.secureHash;
    delete callbackData.secureHash;

    const calculatedHash = generateSecureHash(callbackData);

    if (receivedHash !== calculatedHash) {
      return res.status(400).json({
        success: false,
        message: "Invalid secure hash",
      });
    }

    // Check payment status
    if (
      callbackData.responseCode === "000" ||
      callbackData.responseCode === "0000"
    ) {
      // Payment successful - redirect to frontend success page
      res.redirect(
        `http://localhost:3000/payment-callback?status=success&txnId=${callbackData.txnID}&merchantTxnNo=${callbackData.merchantTxnNo}&amount=${callbackData.amount}`
      );
    } else {
      // Payment failed - redirect to frontend failure page
      res.redirect(
        `http://localhost:3000/payment-callback?status=failed&error=${encodeURIComponent(
          callbackData.respDescription || "Payment failed"
        )}&merchantTxnNo=${callbackData.merchantTxnNo}`
      );
    }
  } catch (error) {
    console.error("Payment callback error:", error);
    res.redirect(
      `http://localhost:3000/payment-callback?status=error&error=${encodeURIComponent(
        "Internal server error"
      )}`
    );
  }
};

// Check transaction status
export const checkStatus = async (req: Request, res: Response) => {
  try {
    const { merchantTxnNo } = req.body;

    if (!merchantTxnNo) {
      return res.status(400).json({
        success: false,
        message: "merchantTxnNo is required",
      });
    }

    const statusData: {
      merchantID: string;
      merchantTxnNo: any;
      originalTxnNo: any;
      transactionType: string;
      secureHash?: string;
    } = {
      merchantID: config.merchantId,
      merchantTxnNo: merchantTxnNo,
      originalTxnNo: merchantTxnNo,
      transactionType: "STATUS",
    };

    statusData.secureHash = generateSecureHash(statusData);

    const formData = new URLSearchParams(statusData);

    const response = await fetch(`${config.baseURL}/pg/api/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    const result = await response.json();

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Transaction status check error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
