import mongoose from "mongoose";
const TransactionSchema = new mongoose.Schema(
  {
    merchantTxnNo: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    customerEmailID: { type: String, required: true },
    cart: { type: mongoose.Schema.Types.Mixed, required: true },
    addressDetail: { type: mongoose.Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
  },
  {
    timestamps: true,
  }
);

export const Transaction = mongoose.model("Transaction", TransactionSchema);
