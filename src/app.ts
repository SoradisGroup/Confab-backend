import express, { type Application } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import paymentRoute from "./routes/paymentRouter.ts";
import cors from 'cors';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());

app.use(cors());

// Routes
app.use("/api/payment", paymentRoute);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
