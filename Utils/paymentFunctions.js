import crypto from "crypto";
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
