// api/mpesa/_daraja.js
// Shared helpers for Daraja M-Pesa integration.

const BASE_URL = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
};

function env() {
  return process.env.MPESA_ENV === "production" ? "production" : "sandbox";
}

function baseUrl() {
  return BASE_URL[env()];
}

// ---------- OAuth ----------
async function getAccessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("Missing M-Pesa consumer key/secret");

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const url = `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Daraja OAuth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

// ---------- Timestamp ----------
// Daraja wants YYYYMMDDHHMMSS in Nairobi time (UTC+3).
function darajaTimestamp() {
  const now = new Date();
  // Force Nairobi time
  const nairobi = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  const y = nairobi.getUTCFullYear();
  const m = String(nairobi.getUTCMonth() + 1).padStart(2, "0");
  const d = String(nairobi.getUTCDate()).padStart(2, "0");
  const hh = String(nairobi.getUTCHours()).padStart(2, "0");
  const mm = String(nairobi.getUTCMinutes()).padStart(2, "0");
  const ss = String(nairobi.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}${hh}${mm}${ss}`;
}

// ---------- Password ----------
// Base64(shortcode + passkey + timestamp)
function darajaPassword(shortcode, passkey, timestamp) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

// ---------- Phone normalizer ----------
// Accepts 07XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX, 01XXXXXXXX
// Returns 2547XXXXXXXX or 2541XXXXXXXX (12 digits)
function normalizePhone(raw) {
  if (!raw) throw new Error("Phone number required");
  let p = String(raw).replace(/[^\d]/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.startsWith("7") || p.startsWith("1")) p = "254" + p;
  if (!/^254\d{9}$/.test(p)) throw new Error(`Invalid phone number: ${raw}`);
  return p;
}

module.exports = {
  getAccessToken,
  darajaTimestamp,
  darajaPassword,
  normalizePhone,
  baseUrl,
  env,
};