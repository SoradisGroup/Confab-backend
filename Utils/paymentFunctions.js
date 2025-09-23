import crypto from "crypto";
import nodemailer from "nodemailer";

const config = {
  merchantId: "T_03342",
  merchantSecretKey: "abc",
  baseURL: "https://qa.phicommerce.com",
  returnURL: "https://confab360degree.com/shipping", // Your Next.js callback page
};

export function generateSecureHash(data) {
  const sortedKeys = Object.keys(data).sort();
  const hashString = sortedKeys
    .filter(
      (key) => data[key] !== null && data[key] !== undefined && data[key] !== ""
    )
    .map((key) => data[key])
    .join("");

  const hmac = crypto.createHmac("sha256", config.merchantSecretKey);
  hmac.update(hashString);
  return hmac.digest("hex").toLowerCase();
}

export // Generate transaction date in required format
function generateTxnDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export async function sendPaymentSuccessEmail(
  {merchantTxnNo,
  amount,
  customerEmailID,
  cart,
  addressDetail}
) {
  try {
    let cartItems = [];
    
    if (Array.isArray(cart)) {
      cartItems = cart;
    } else if (cart && typeof cart === "object") {
      cartItems = [cart]; // wrap single object into an array
    }
    
          // Build cart HTML for email
        const cartHTML =
      cartItems.length > 0
        ? `
          <h3>Cart Details:</h3>
          <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
            <tr style="background-color:#f4f6f8;">
              <th style="text-align:left;">Name</th>
              <th>Duration</th>
              <th>Price</th>
            </tr>
            ${cartItems?.map(
                (item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.selectedDuration?.name || "-"}</td>
                  <td>${item.selectedDuration?.price || item.purchaseAtPrice || 0} INR</td>
                </tr>
              `
              )
              .join("")}
          </table>
        `
        : "";
    
          // Build address HTML for email
          const address = addressDetail;
          const addressHTML = address
            ? `
            <h3>Address Details:</h3>
            <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
              <tr><td>Name:</td><td>${address.salutation} ${address.firstName} ${address.lastName}</td></tr>
              <tr><td>Email:</td><td>${address.email}</td></tr>
              <tr><td>Phone:</td><td>${address.phone}</td></tr>
              <tr><td>Company:</td><td>${address.companyName || "-"}</td></tr>
              <tr><td>Street:</td><td>${address.streetAddress || "-"}</td></tr>
              <tr><td>City:</td><td>${address.city || "-"}</td></tr>
              <tr><td>State:</td><td>${address.state || "-"}</td></tr>
              <tr><td>Country:</td><td>${address.country || "-"}</td></tr>
              <tr><td>Pin Code:</td><td>${address.pinCode || "-"}</td></tr>
              <tr><td>Service:</td><td>${address.service || "-"}</td></tr>
              <tr><td>Duration:</td><td>${address.duration || "-"}</td></tr>
            </table>
          `
            : "";
    
          // Send email after payment initiation success
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
          });
    
          const mailOptions = {
            from: process.env.GMAIL_USER,
            to: process.env.GMAIL_USER,
            replyTo: customerEmailID,
            subject: `Payment Success: ${merchantTxnNo}`,
            html: `
              <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
                <h2>Payment Successful</h2>
                <p>Transaction No: ${merchantTxnNo}</p>
                <p>Amount: ${amount} INR</p>
                ${cartHTML}
                ${addressHTML}
              </div>
            `,
          };
    
          await transporter.sendMail(mailOptions);

    console.log("Payment success email sent");
  } catch (error) {
    console.error("Error sending payment success email:", error);
  }
}
