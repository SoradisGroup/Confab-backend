import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import paymentRoute from "./routes/paymentRoute.js";
import careerRoute from "./routes/careerRoute.js";
import contactRoute from "./routes/contactRoute.js";

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
app.use("/api/payment", paymentRoute);
app.use("/api/career", careerRoute);
app.use("/api/contact", contactRoute);

// server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
