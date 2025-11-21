import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import paymentRoute from "./routes/paymentRoute.js";
import careerRoute from "./routes/careerRoute.js";
import contactRoute from "./routes/contactRoute.js";
import { sendPaymentSuccessEmail } from "./paymentFunctions.js";
import { Transaction } from "./model/Transaction.js";
import mongoose from "mongoose";

dotenv.config({
  path: "./.env",
});

const app = express();
const PORT = process.env.PORT;

app.use(bodyParser.json());
app.use(cors());

// ✅ Configure CORS properly
const allowedOrigins = [
  "https://www.confab360degree.com",
  "http://localhost:3000", // for dev
];

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   methods: ["GET", "POST", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// }));

// // ✅ Handle preflight
// app.options("*", cors());

// Routing
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));
app.use("/api/payment", paymentRoute);
app.use("/api/career", careerRoute);
app.use("/api/contact", contactRoute);
app.post("/api/payment/icici-return", async (req, res) => {
  console.log("Payment Response From ICICI:", req.body);

  // const getTransaction = await Transaction.findOne({
  //   merchantTxnNo: req.body.merchantTxnNo,
  // });

  // if (getTransaction)
  //   await sendPaymentSuccessEmail({
  //     merchantTxnNo: getTransaction.merchantTxnNo,
  //     amount: getTransaction.amount,
  //     customerEmailID: getTransaction.customerEmailID,
  //     cart: getTransaction.cart,
  //     addressDetail: getTransaction.addressDetail,
  //   });
  // OPTIONAL: save transaction, verify secure hash, update DB

  // Redirect user back to service list page
  res.redirect("https://www.confab360degree.com/shipping/success");
});

// server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
