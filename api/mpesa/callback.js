// api/mpesa/callback.js
// POST /api/mpesa/callback
// This URL is called BY SAFARICOM when the customer finishes (or fails) the STK Push.
// We log the full body so you can see what arrives.
const { updateOrder } = require("./_store");
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ResultCode: 1, ResultDesc: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const stk = body?.Body?.stkCallback;

    if (!stk) {
      console.warn("callback: unexpected body", JSON.stringify(body));
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stk;

    console.log("=== M-Pesa Callback Received ===");
    console.log("MerchantRequestID:", MerchantRequestID);
    console.log("CheckoutRequestID:", CheckoutRequestID);
    console.log("ResultCode:", ResultCode);
    console.log("ResultDesc:", ResultDesc);

        if (ResultCode === 0 && CallbackMetadata) {
      const items = CallbackMetadata.Item || [];
      const get = (name) => items.find((i) => i.Name === name)?.Value;
      const receipt = get("MpesaReceiptNumber");
      const amount = get("Amount");
      const phone = get("PhoneNumber");
      const txnDate = get("TransactionDate");

      console.log("✅ PAYMENT SUCCESSFUL");
      console.log("Receipt:", receipt);
      console.log("Amount:", amount);
      console.log("Phone:", phone);
      console.log("Date:", txnDate);

      updateOrder(CheckoutRequestID, {
        status: "success",
        receipt,
        amount,
        phone,
        txnDate,
        resultDesc: ResultDesc,
      });
    } else {
      console.log("❌ PAYMENT FAILED OR CANCELLED");
      console.log("ResultCode:", ResultCode, "—", ResultDesc);

      await updateOrder(CheckoutRequestID, {
        status: "failed",
        resultCode: ResultCode,
        resultDesc: ResultDesc,
      });
    }

    // Always return 200 quickly, otherwise Safaricom retries.
    return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    console.error("callback error:", err);
    return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
};