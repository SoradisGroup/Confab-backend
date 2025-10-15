import axios from "axios";
import https from "https";
import {
  generateSecureHash,
  generateTxnDate,
  getICICIConfig,
  sendPaymentSuccessEmail,
} from "../Utils/paymentFunctions.js";

const BASE_URL =
  process.env.ICICI_BASE_URL || "https://uat-api.icicibank.com/orangepg";

const headers = {
  "Content-Type": "application/json",
  ClientId: process.env.ICICI_CLIENT_ID || "",
  ClientSecret: process.env.ICICI_CLIENT_SECRET || "",
};

// const config = {
//   merchantId: "T_03342",
//   merchantSecretKey: "abc",
//   baseURL: "https://qa.phicommerce.com",
//   returnURL: "https://confab360degree.com/shipping", // Your Next.js callback page
// };

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

    const { merchantId,merchantSecretKey,baseURL,returnURL } = getICICIConfig();

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
      merchantId: merchantId,
      merchantTxnNo: merchantTxnNo,
      amount: parseFloat(amount).toFixed(2),
      currencyCode: currency === 'INR' ? "356" : "978",
      payType: "0", // Standard mode
      customerEmailID: customerEmailID,
      transactionType: "SALE",
      txnDate: generateTxnDate(),
      returnURL: returnURL,
      customerMobileNo: customerMobileNo,
      addlParam1: addlParam1,
      addlParam2: addlParam2,
    };

    // Generate secure hash
    paymentData.secureHash = generateSecureHash(paymentData);


//     console.log("Payment Data:", {
//   ...paymentData,
//   secureHash: paymentData.secureHash.substring(0, 20) + "..." // Only show first 20 chars for security
// });

    // Make API call to ICICI
    const response = await fetch(`${baseURL}/pg/api/v2/initiateSale`, {
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

    const { merchantId,merchantSecretKey,baseURL,returnURL } = getICICIConfig();

    if (!merchantTxnNo) {
      return res.status(400).json({
        success: false,
        message: "merchantTxnNo is required",
      });
    }

    const statusData = {
      merchantID: merchantId,
      merchantTxnNo: merchantTxnNo,
      originalTxnNo: merchantTxnNo,
      transactionType: "STATUS",
    };

    statusData.secureHash = generateSecureHash(statusData);

    const formData = new URLSearchParams(statusData);

    const response = await fetch(`${baseURL}/pg/api/command`, {
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










// // import fetch from "node-fetch"; // or global fetch in Node 18+
// import {
//   generateSecureHash,
//   generateTxnDate,
//   sendPaymentSuccessEmail,
//   getICICIConfig, // <-- new
// } from "../Utils/paymentFunctions.js";

// // ---------------------------
// // Initialize Payment
// // ---------------------------
// export const intializePayment = async (req, res) => {
//   try {
//     const config = getICICIConfig(); // read env at runtime

//     const {
//       amount,
//       customerEmailID,
//       customerMobileNo,
//       merchantTxnNo,
//       addlParam1 = "",
//       addlParam2 = "",
//       cart,
//       addressDetail,
//       currency = "INR",
//     } = req.body;

//     // Validate required fields
//     if (!amount || !customerEmailID || !customerMobileNo || !merchantTxnNo) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields",
//       });
//     }

//     // Prepare payment payload (fields required for ICICI)
//     const paymentData = {
//     merchantId: config.merchantId,
//     merchantTxnNo,
//     amount: parseFloat(amount).toFixed(2),
//     currencyCode: currency === "INR" ? "356" : "978",
//     transactionType: "SALE",
//     txnDate: generateTxnDate(),
//     returnURL: config.returnURL,
//     customerEmailID,
//     customerMobileNo,
//     addlParam1: addlParam1 ?? "",
//     addlParam2: addlParam2 ?? "",
//     payType: "0", // include in payload, but NOT in hash
//     }; 


    

//     // Generate secure hash for ICICI
//     paymentData.secureHash = generateSecureHash(paymentData);


// //     console.log("=== HASH DEBUG ===");
// // console.log("Payment data for hash:", {
// //   ...paymentData,
// //   secureHash: undefined // exclude from log
// // });
// // console.log("Generated hash:", paymentData.secureHash);
// // console.log("Merchant secret key (first 5 chars):", config.merchantSecretKey.substring(0, 5));

//     const requestURL = `${config.baseURL}/initiateSale`;
//     // console.log("Payment request URL:", requestURL);
//     // console.log("Payment payload:", paymentData);

//     // Call ICICI API
//     const response = await fetch(requestURL, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(paymentData),
//     });

//     const result = await response.json();
//     console.log("ICICI response:", result);

//     if (result.responseCode === "R1000") {
//       // Send payment success email (cart & address only for email)
//       await sendPaymentSuccessEmail({
//         merchantTxnNo: paymentData.merchantTxnNo,
//         amount: paymentData.amount,
//         customerEmailID: paymentData.customerEmailID,
//         cart,
//         addressDetail,
//       });

//       return res.json({
//         success: true,
//         data: {
//           redirectURI: result.redirectURI,
//           tranCtx: result.tranCtx,
//           merchantTxnNo,
//         },
//       });
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: result.responseDescription || "Payment initiation failed",
//       });
//     }
//   } catch (error) {
//     console.error("Payment initiation error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

// // ---------------------------
// // Handle Payment Callback
// // ---------------------------
// export const HandlePaymentCallback = (req, res) => {
//   try {
//     const config = getICICIConfig(); // runtime config
//     const callbackData = req.body;

//     const receivedHash = callbackData.secureHash;
//     delete callbackData.secureHash;
//     const calculatedHash = generateSecureHash(callbackData);

//     if (receivedHash !== calculatedHash) {
//       return res.status(400).json({ success: false, message: "Invalid secure hash" });
//     }

//     const frontendBase = "https://confab360degree.com";

//     if (["000", "0000"].includes(callbackData.responseCode)) {
//       res.redirect(
//         `${frontendBase}/payment-callback?status=success&txnId=${callbackData.txnID}&merchantTxnNo=${callbackData.merchantTxnNo}&amount=${callbackData.amount}`
//       );
//     } else {
//       res.redirect(
//         `${frontendBase}/payment-callback?status=failed&error=${encodeURIComponent(
//           callbackData.respDescription || "Payment failed"
//         )}&merchantTxnNo=${callbackData.merchantTxnNo}`
//       );
//     }
//   } catch (error) {
//     console.error("Payment callback error:", error);
//     res.redirect(
//       `https://confab360degree.com/payment-callback?status=error&error=${encodeURIComponent(
//         "Internal server error"
//       )}`
//     );
//   }
// };

// // ---------------------------
// // Check Transaction Status
// // ---------------------------
// export const checkStatus = async (req, res) => {
//   try {
//     const config = getICICIConfig(); // runtime config
//     const { merchantTxnNo } = req.body;

//     if (!merchantTxnNo) {
//       return res.status(400).json({ success: false, message: "merchantTxnNo is required" });
//     }

//     const statusData = {
//       merchantID: config.merchantId,
//       merchantTxnNo,
//       originalTxnNo: merchantTxnNo,
//       transactionType: "STATUS",
//     };

//     statusData.secureHash = generateSecureHash(statusData);

//     const formData = new URLSearchParams(statusData);
//     const COMMAND_API = (config.baseURL || "").replace("/v2", "") + "/command";

//     const response = await fetch(COMMAND_API, {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: formData,
//     });

//     const result = await response.json();

//     return res.json({ success: true, data: result });
//   } catch (error) {
//     console.error("Transaction status check error:", error);
//     return res.status(500).json({ success: false, message: "Internal server error" });
//   }
// };
