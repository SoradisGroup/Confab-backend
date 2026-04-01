import crypto from "crypto";
import nodemailer from "nodemailer";

import { Resend } from "resend";

const resend = new Resend("re_VuiAxygU_L7nfYZoRqBhft2DcXMTfXBaA");

export function getICICIConfig() {
  return {
    merchantId: process.env.ICICI_MERCHANT_ID,
    merchantSecretKey: process.env.ICICI_MERCHANT_SECRET,
    baseURL: process.env.ICICI_BASE_URL,
    returnURL: process.env.ICICI_RETURN_URL,
  };
}

export function generateSecureHash(data) {
  const { merchantSecretKey } = getICICIConfig();

  // Step 1: Filter out null/undefined/empty, then sort keys alphabetically
  const hashString = Object.keys(data)
    .filter(key =>
      data[key] !== null &&
      data[key] !== undefined &&
      data[key] !== "" &&
      key !== "secureHash" // exclude secureHash itself if present
    )
    .sort() // sort AFTER filtering
    .map(key => data[key])
    .join("");

  console.log("=== HASH DEBUG ===");
  console.log("Hash input string:", hashString);
  console.log("currencyCode in hash:", data.currencyCode); // verify 978 vs 356
  console.log("=================");

  // Step 2: HMAC-SHA256 with ASCII encoding (as per PhiCommerce spec)
  const hmac = crypto.createHmac("sha256", merchantSecretKey);
  hmac.update(hashString, "ascii"); // ← ASCII is required by spec
  return hmac.digest("hex").toLowerCase();
}

export function generateTxnDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export async function sendPaymentSuccessEmail({
  merchantTxnNo,
  amount,
  customerEmailID,
  cart,
  addressDetail,
}) {
  try {
    let cartItems = [];

    if (Array.isArray(cart)) {
      cartItems = cart;
    } else if (cart && typeof cart === "object") {
      cartItems = [cart];
    }

    // Cart HTML
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
          ${cartItems
          .map(
            (item) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.selectedDuration?.name || "-"}</td>
                <td>${item.selectedDuration?.price ||
              item.purchaseAtPrice ||
              0
              } INR</td>
              </tr>
            `
          )
          .join("")}
        </table>
      `
        : "";

    // Address HTML
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

    const { error } = await resend.emails.send({
      from: "Confab360 <onboarding@resend.dev>", // same as your ticket email
      to: "confab360degree01@gmail.com", // or admin email
      reply_to: customerEmailID,
      subject: `Payment Success: ${merchantTxnNo}`,
      html: `
        <body style="font-family:Arial;background:#f6f7fb;padding:40px">
          <table width="500" align="center" style="background:white;padding:30px;border-radius:12px">
            
            <tr>
              <td align="center">
                <h2 style="color:#7A4A36">CONFAB360</h2>
                <p>Payment Confirmation</p>
              </td>
            </tr>

            <tr>
              <td>
                <h3>Payment Successful 🎉</h3>
                <p><strong>Transaction No:</strong> ${merchantTxnNo}</p>
                <p><strong>Amount:</strong> ${amount} INR</p>

                ${cartHTML}
                ${addressHTML}

                <hr style="margin:25px 0"/>

                <p style="font-size:12px;color:#888">
                  This is an automated confirmation email.
                </p>
              </td>
            </tr>

          </table>

          <h6 style="text-align:center;">OMESSENCE LLC All Rights Reserved.</h6>
        </body>
      `,
    });

    if (error) throw error;

    console.log("Payment success email sent via Resend");
    return true;
  } catch (error) {
    console.error("Error sending payment success email:", error);
    return false;
  }
}

export async function sendPaymentSuccessEmailToCustomer({
  merchantTxnNo,
  amount,
  customerEmailID,
  cart,
  addressDetail,
}) {
  try {
    let cartItems = [];

    if (Array.isArray(cart)) {
      cartItems = cart;
    } else if (cart && typeof cart === "object") {
      cartItems = [cart];
    }

    // Cart HTML
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
          ${cartItems
          .map(
            (item) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.selectedDuration?.name || "-"}</td>
                <td>${item.selectedDuration?.price ||
              item.purchaseAtPrice ||
              0
              } INR</td>
              </tr>
            `
          )
          .join("")}
        </table>
      `
        : "";

    // Address HTML
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

    const { error } = await resend.emails.send({
      from: "Confab360 <onboarding@resend.dev>", // same as your ticket email
      to: customerEmailID,
      reply_to: customerEmailID,
      subject: `Payment Success: ${merchantTxnNo}`,
      html: `
        <body style="font-family:Arial;background:#f6f7fb;padding:40px">
          <table width="500" align="center" style="background:white;padding:30px;border-radius:12px">
            
            <tr>
              <td align="center">
                <h2 style="color:#7A4A36">CONFAB360</h2>
                <p>Payment Confirmation</p>
              </td>
            </tr>

            <tr>
              <td>
                <h3>Payment Successful 🎉</h3>
                <p><strong>Transaction No:</strong> ${merchantTxnNo}</p>
                <p><strong>Amount:</strong> ${amount} INR</p>

                ${cartHTML}
                ${addressHTML}

                <hr style="margin:25px 0"/>

                <p style="font-size:12px;color:#888">
                  This is an automated confirmation email.
                </p>
              </td>
            </tr>

          </table>

          <h6 style="text-align:center;">OMESSENCE LLC All Rights Reserved.</h6>
        </body>
      `,
    });

    if (error) throw error;

    console.log("Payment success email sent via Resend");
    return true;
  } catch (error) {
    console.error("Error sending payment success email:", error);
    return false;
  }
}







// import crypto from "crypto";
// import nodemailer from "nodemailer";

// // ---------------------------
// // Runtime config getter
// // ---------------------------
// export function getICICIConfig() {
//   return {
//     merchantId: process.env.ICICI_MERCHANT_ID,
//     merchantSecretKey: process.env.ICICI_MERCHANT_SECRET,
//     baseURL: process.env.ICICI_BASE_URL,
//     returnURL: process.env.ICICI_RETURN_URL,
//   };
// }

// // ---------------------------
// // Generate secure hash for ICICI payload
// // ---------------------------
// export function generateSecureHash(data) {

//   const keysOrder = [
//     "merchantId",
//     "merchantTxnNo",
//     "amount",
//     "currencyCode",
//     "transactionType",
//     "txnDate",
//     "returnURL",
//     "customerEmailID",
//     "customerMobileNo",
//     "addlParam1",
//     "addlParam2",
//   ];

//   const hashString = keysOrder
//     .map((key) => (data[key] ?? "").toString().trim()) // trim strings
//     .join("");

//   const { merchantSecretKey } = getICICIConfig();

// // console.log("Secret key length:", merchantSecretKey?.length);
// //   console.log("Secret key first 10 chars:", merchantSecretKey?.substring(0, 10));
// //   console.log("Has quotes?", merchantSecretKey?.startsWith('"'));

//   const hmac = crypto.createHmac("sha256", merchantSecretKey);
//   hmac.update(hashString);
//   return hmac.digest("hex").toLowerCase();
// }

// // ---------------------------
// // Generate transaction date in ICICI required format
// // ---------------------------
// export function generateTxnDate() {
//   const now = new Date();
//   const pad = (n) => String(n).padStart(2, "0");
//   return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(
//     now.getHours()
//   )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
// }

// // ---------------------------
// // Send payment success email
// // ---------------------------
// export async function sendPaymentSuccessEmail({ merchantTxnNo, amount, customerEmailID, cart, addressDetail }) {
//   try {
//     const cartHTML =
//       Array.isArray(cart) && cart.length
//         ? `
//       <h3>Cart Details:</h3>
//       <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
//         <tr style="background-color:#f4f6f8;">
//           <th style="text-align:left;">Name</th>
//           <th>Duration</th>
//           <th>Price</th>
//         </tr>
//         ${cart
//           .map(
//             (item) => `
//           <tr>
//             <td>${item.name}</td>
//             <td>${item.selectedDuration?.name || "-"}</td>
//             <td>${item.selectedDuration?.price || item.purchaseAtPrice || 0} INR</td>
//           </tr>
//         `
//           )
//           .join("")}
//       </table>
//     `
//         : "";

//     const address = addressDetail;
//     const addressHTML = address
//       ? `
//       <h3>Address Details:</h3>
//       <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
//         <tr><td>Name:</td><td>${address.salutation} ${address.firstName} ${address.lastName}</td></tr>
//         <tr><td>Email:</td><td>${address.email}</td></tr>
//         <tr><td>Phone:</td><td>${address.phone}</td></tr>
//         <tr><td>Company:</td><td>${address.companyName || "-"}</td></tr>
//         <tr><td>Street:</td><td>${address.streetAddress || "-"}</td></tr>
//         <tr><td>City:</td><td>${address.city || "-"}</td></tr>
//         <tr><td>State:</td><td>${address.state || "-"}</td></tr>
//         <tr><td>Country:</td><td>${address.country || "-"}</td></tr>
//         <tr><td>Pin Code:</td><td>${address.pinCode || "-"}</td></tr>
//         <tr><td>Service:</td><td>${address.service || "-"}</td></tr>
//         <tr><td>Duration:</td><td>${address.duration || "-"}</td></tr>
//       </table>
//     `
//       : "";

//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
//     });

//     await transporter.sendMail({
//       from: process.env.GMAIL_USER,
//       to: process.env.GMAIL_USER,
//       replyTo: customerEmailID,
//       subject: `Payment Success: ${merchantTxnNo}`,
//       html: `<div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
//         <h2>Payment Successful</h2>
//         <p>Transaction No: ${merchantTxnNo}</p>
//         <p>Amount: ${amount} INR</p>
//         ${cartHTML}
//         ${addressHTML}
//       </div>`,
//     });

//     console.log("Payment success email sent");
//   } catch (error) {
//     console.error("Error sending payment success email:", error);
//   }
// }
