import mongoose from "mongoose";
const TransactionSchema = new mongoose.Schema(
  {
    merchantTxnNo: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    customerEmailID: { type: String, required: true },
    cart: { type: mongoose.Schema.Types.Mixed, required: true },
    addressDetail: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const Transaction = mongoose.model("Transaction", TransactionSchema);
