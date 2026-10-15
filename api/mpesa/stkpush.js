// api/mpesa/stkpush.js
// POST /api/mpesa/stkpush
// Body: { phone, amount, accountReference?, description? }
// Returns: { success, checkoutRequestId, merchantRequestId, customerMessage }

const {
  getAccessToken,
  darajaTimestamp,
  darajaPassword,
  normalizePhone,
  baseUrl,
} = require("./_daraja");
const { setOrder } = require("./_store");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { phone, amount, accountReference, description } = req.body || {};

    if (!phone) return res.status(400).json({ success: false, error: "Phone required" });
    if (!amount || Number(amount) < 1) return res.status(400).json({ success: false, error: "Valid amount required" });

    const normalizedPhone = normalizePhone(phone);
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;

    if (!shortcode || !passkey) {
      return res.status(500).json({ success: false, error: "M-Pesa not configured" });
    }

    // Where Safaricom will POST the result.
    // In production, set MPESA_CALLBACK_URL env var to your real domain.
    // In dev, we'll use ngrok and set this env var temporarily.
    const callbackUrl = process.env.MPESA_CALLBACK_URL;
    if (!callbackUrl) {
      return res.status(500).json({
        success: false,
        error: "MPESA_CALLBACK_URL not set. Start ngrok and set the env var.",
      });
    }

    const timestamp = darajaTimestamp();
    const password = darajaPassword(shortcode, passkey, timestamp);
    const token = await getAccessToken();

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(Number(amount)),
      PartyA: normalizedPhone,
      PartyB: shortcode,
      PhoneNumber: normalizedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference || "SoleVaultOrder",
      TransactionDesc: description || "Sole Vault purchase",
    };

    const response = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

        if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.errorMessage || "STK Push failed",
        raw: data,
      });
    }

    // Record this order as "pending" so status polling has something to read.
    await setOrder(data.CheckoutRequestID, {
      status: "pending",
      amount: Math.round(Number(amount)),
      phone: normalizedPhone,
      accountReference: accountReference || "SoleVaultOrder",
      createdAt: Date.now(),
    });

    return res.status(200).json({
      success: true,
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
      customerMessage: data.CustomerMessage,
      responseCode: data.ResponseCode,
      responseDescription: data.ResponseDescription,
    });
  } catch (err) {
    console.error("stkpush error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};