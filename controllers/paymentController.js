import axios from "axios";
import https from "https";
import {
  generateSecureHash,
  generateTxnDate,
  sendPaymentSuccessEmail,
} from "../Utils/paymentFunctions.js";

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
      cart,
      addressDetail,
      currency
    } = req.body;

    // Validate required fields
    if (!amount || !customerEmailID || !customerMobileNo || !merchantTxnNo) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // console.log(req.body);


    // 356 - Rupiees
    // 840 - Dollar
    // 978 - Euro

    const paymentData = {
      merchantId: config.merchantId,
      merchantTxnNo: merchantTxnNo,
      amount: parseFloat(amount).toFixed(2),
      currencyCode: currency === 'INR' ? "356" : "978",
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
      // const emailData = {
      //   customerEmail: customerEmailID,
      //   customerName: "Customer",
      //   amount: amount,
      //   merchantTxnNo: merchantTxnNo,
      //   status: "initiated",
      // };


   await sendPaymentSuccessEmail({
  merchantTxnNo: paymentData.merchantTxnNo,
  amount: paymentData.amount,
  customerEmailID: paymentData.customerEmailID,
  cart,
  addressDetail,
});

 
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
export const HandlePaymentCallback = (req, res) => {
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
        `http://192.168.1.7:3000/payment-callback?status=success&txnId=${callbackData.txnID}&merchantTxnNo=${callbackData.merchantTxnNo}&amount=${callbackData.amount}`
      );
    } else {
      // Payment failed - redirect to frontend failure page
      res.redirect(
        `http://192.168.1.7:3000/payment-callback?status=failed&error=${encodeURIComponent(
          callbackData.respDescription || "Payment failed"
        )}&merchantTxnNo=${callbackData.merchantTxnNo}`
      );
    }
  } catch (error) {
    console.error("Payment callback error:", error);
    res.redirect(
      `http://192.168.1.7:3000/payment-callback?status=error&error=${encodeURIComponent(
        "Internal server error"
      )}`
    );
  }
};

// Check transaction status
export const checkStatus = async (req, res) => {
  try {
    const { merchantTxnNo } = req.body;

    if (!merchantTxnNo) {
      return res.status(400).json({
        success: false,
        message: "merchantTxnNo is required",
      });
    }

    const statusData = {
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