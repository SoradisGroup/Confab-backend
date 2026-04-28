import Razorpay from "razorpay";
import crypto from "crypto";
import { sendPaymentSuccessEmail } from "../paymentFunctions.js";

export async function createOrder(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { amount, currency } = req.body;

    const razorpay = new Razorpay({
      key_id: "rzp_live_Si2HUWIJF3jxsA",
      key_secret: "u6v27uSC8Gof8O8tEFfKKGHI",
    });

    const options = {
      amount: amount * 100,
      currency: currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Order creation failed",
    });
  }
}

export async function verifyOrder(req, res) {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    paymentData,
    currency,
  } = req.body;

  const generated_signature = crypto
    .createHmac("sha256", "u6v27uSC8Gof8O8tEFfKKGHI")
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generated_signature === razorpay_signature) {
    await sendPaymentSuccessEmail({
      merchantTxnNo: razorpay_order_id,
      amount: paymentData?.amount,
      customerEmailID: paymentData?.customerEmailID,
      cart: paymentData?.cart,
      addressDetail: paymentData?.addressDetail,
      currency,
    });
    return res.status(200).json({ success: true });
  } else {
    return res.status(400).json({ success: false });
  }
}
