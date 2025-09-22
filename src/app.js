
import express from "express"
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors"
import paymentRoute from "../src/routes/paymentRoute.js"


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());

// Routing
app.use("/api/payment", paymentRoute);

// server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});


export default app;

