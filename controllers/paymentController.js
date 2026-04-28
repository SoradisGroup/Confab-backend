import { Transaction } from "../model/Transaction.js";
import {
  generateSecureHash,
  generateTxnDate,
  getICICIConfig,
  sendPaymentSuccessEmail,
  sendPaymentSuccessEmailToCustomer,
} from "../paymentFunctions.js";

// const BASE_URL =
//   process.env.ICICI_BASE_URL || "https://uat-api.icicibank.com/orangepg";

// const headers = {
//   "Content-Type": "application/json",
//   ClientId: process.env.ICICI_CLIENT_ID || "",
//   ClientSecret: process.env.ICICI_CLIENT_SECRET || "",
// };

// const config = {
//   merchantId: "T_03342",
//   merchantSecretKey: "abc",
//   baseURL: "https://qa.phicommerce.com",
//   returnURL: "https://confab360degree.com/shipping", // Your Next.js callback page
// };

let localDataBase = [];
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
      currency,
    } = req.body;

    const { merchantId, merchantSecretKey, baseURL, returnURL } =
      getICICIConfig();

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
      currencyCode: currency === "INR" ? "356" : "978",
      payType: "0",
      customerEmailID: customerEmailID,
      transactionType: "SALE",
      txnDate: generateTxnDate(),
      returnURL:
        "https://api.confab360degree.com/api/payment/icici-return?merchantTxnNo=" +
        merchantTxnNo,
      customerMobileNo: customerMobileNo,
    };

    console.log({ paymentData });

    // Only add addlParams if they have actual values
    if (addlParam1) paymentData.addlParam1 = addlParam1;
    if (addlParam2) paymentData.addlParam2 = addlParam2;

    // Generate hash AFTER building the complete object
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
      const createTransaction = new Transaction({
        merchantTxnNo: paymentData.merchantTxnNo,
        amount: paymentData.amount,
        customerEmailID: paymentData.customerEmailID,
        cart,
        addressDetail,
      });
      await createTransaction.save();
      localDataBase.push({
        merchantTxnNo: paymentData.merchantTxnNo,
        amount: paymentData.amount,
        customerEmailID: paymentData.customerEmailID,
        cart,
        addressDetail,
      });

      // await createTransaction.save();
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
      error: error,
      success: false,
      message: "Internal server error",
    });
  }
};

export const intializePaymentForNeat = async (req, res) => {
  try {
    const {
      amount,
      customerEmailID,
      customerMobileNo,
      merchantTxnNo,
      cart,
      addressDetail,
      currency,
      // NEAT Portal params
      courseid,
      sessionid,
      studentid,
    } = req.body;

    const { merchantId, baseURL } = getICICIConfig();

    // Validate required fields
    if (!amount || !customerEmailID || !customerMobileNo || !merchantTxnNo) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Validate NEAT required fields
    if (!courseid || !studentid || !sessionid) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required NEAT portal fields (courseid, studentid, sessionid)",
      });
    }

    const paymentData = {
      merchantId: merchantId,
      merchantTxnNo: merchantTxnNo,
      amount: parseFloat(amount).toFixed(2),
      // currencyCode: currency === "INR" ? "356" : "978",
      currencyCode: "356",
      payType: "0",
      customerEmailID: customerEmailID,
      transactionType: "SALE",
      txnDate: generateTxnDate(),
      returnURL: "https://api.confab360degree.com/api/payment/icici-return",
      customerMobileNo: customerMobileNo,
      addlParam1: studentid,
      addlParam2: `${courseid}|${sessionid}`,
    };

    console.log({ paymentData });

    paymentData.secureHash = generateSecureHash(paymentData);

    const response = await fetch(`${baseURL}/pg/api/v2/initiateSale`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();

    if (result.responseCode === "R1000") {
      // ✅ Send payment success email
      await sendPaymentSuccessEmail({
        merchantTxnNo: paymentData.merchantTxnNo,
        amount: paymentData.amount,
        customerEmailID: paymentData.customerEmailID,
        cart,
        addressDetail,
        currency,
      });

      // ✅ Notify NEAT portal of successful payment
      const NEAT_VERIFICATION_URL =
        "https://neat.aicte-india.org/payment-verification";
      const neatParams = new URLSearchParams({
        studentid: studentid,
        Success: "1",
        sessionid: sessionid,
        payment: "online",
        courseid: courseid,
      });

      await fetch(`${NEAT_VERIFICATION_URL}?${neatParams.toString()}`, {
        method: "GET",
      });

      console.log(
        `NEAT notified: ${NEAT_VERIFICATION_URL}?${neatParams.toString()}`,
      );

      return res.json({
        success: true,
        data: {
          redirectURI: result.redirectURI,
          tranCtx: result.tranCtx,
          merchantTxnNo: merchantTxnNo,
          // Return NEAT redirect URL to frontend in case it needs to redirect user
          neatRedirectURL: `${NEAT_VERIFICATION_URL}?${neatParams.toString()}`,
        },
      });
    } else {
      // ❌ Notify NEAT portal of failed payment
      const NEAT_VERIFICATION_URL =
        "https://neat.aicte-india.org/payment-verification";
      const neatFailParams = new URLSearchParams({
        studentid: studentid,
        Failure: "1",
        sessionid: sessionid,
        payment: "online",
        courseid: courseid,
      });

      await fetch(`${NEAT_VERIFICATION_URL}?${neatFailParams.toString()}`, {
        method: "GET",
      });

      console.log(
        `NEAT notified of failure: ${NEAT_VERIFICATION_URL}?${neatFailParams.toString()}`,
      );

      return res.status(400).json({
        success: false,
        message: result.responseDescription || "Payment initiation failed",
        neatRedirectURL: `${NEAT_VERIFICATION_URL}?${neatFailParams.toString()}`,
      });
    }
  } catch (error) {
    console.error("Payment initiation error:", error);
    return res.status(500).json({
      error: error,
      success: false,
      message: "Internal server error",
    });
  }
};

export const iciciReturnHandler = async (req, res) => {
  try {
    const { responseCode, addlParam1, addlParam2 } = req.body;

    const studentid = addlParam1;
    const [courseid, sessionid] = (addlParam2 || "").split("|");

    const NEAT_URL = "https://neat.aicte-india.org/payment-verification";

    const isSuccess = responseCode === "R1000";

    if (isSuccess) {
      const url = `${NEAT_URL}?studentid=${studentid}&Success=1&sessionid=${sessionid}&payment=online&courseid=${courseid}`;
      return res.json({ url });
    } else {
      const url = `${NEAT_URL}?studentid=${studentid}&Failure=1&sessionid=${sessionid}&payment=online&courseid=${courseid}`;
      return res.json({ url });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send("Error");
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
        `http://192.168.1.7:3000/payment-callback?status=success&txnId=${callbackData.txnID}&merchantTxnNo=${callbackData.merchantTxnNo}&amount=${callbackData.amount}`,
      );
    } else {
      // Payment failed - redirect to frontend failure page
      res.redirect(
        `http://192.168.1.7:3000/payment-callback?status=failed&error=${encodeURIComponent(
          callbackData.respDescription || "Payment failed",
        )}&merchantTxnNo=${callbackData.merchantTxnNo}`,
      );
    }
  } catch (error) {
    console.error("Payment callback error:", error);
    res.redirect(
      `http://192.168.1.7:3000/payment-callback?status=error&error=${encodeURIComponent(
        "Internal server error",
      )}`,
    );
  }
};

// Check transaction status
export const checkStatus = async (req, res) => {
  try {
    const { merchantTxnNo } = req.body;

    const { merchantId, merchantSecretKey, baseURL, returnURL } =
      getICICIConfig();

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

    console.log("Transaction status result:", result);

    const paymentData = await Transaction.findOne({
      merchantTxnNo: merchantTxnNo,
      status: "pending",
    });
    console.log({ paymentData });
    if (result.responseCode == "000" && paymentData) {
      await sendPaymentSuccessEmail({
        merchantTxnNo: paymentData?.merchantTxnNo,
        amount: paymentData?.amount,
        customerEmailID: paymentData?.customerEmailID,
        cart: paymentData?.cart,
        addressDetail: paymentData?.addressDetail,
      });
      await Transaction.findByIdAndUpdate(
        paymentData?._id,
        { status: "success" },
        { new: true },
      );
      // await sendPaymentSuccessEmailToCustomer({
      //   merchantTxnNo: paymentData.merchantTxnNo,
      //   amount: paymentData.amount,
      //   customerEmailID: paymentData.customerEmailID,
      //   cart: paymentData.cart,
      //   addressDetail: paymentData.addressDetail,
      // });
    }

    return res.json({
      success: true,
      data: result,
      responseCode: result?.responseCode,
    });
  } catch (error) {
    console.error("Transaction status check error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
