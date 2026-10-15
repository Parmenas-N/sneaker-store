// api/mpesa/status.js
// GET /api/mpesa/status?checkoutRequestId=ws_CO_...
// Returns the current status of a payment.

const { getOrder } = require("./_store");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { checkoutRequestId } = req.query || {};
  if (!checkoutRequestId) {
    return res.status(400).json({ error: "checkoutRequestId required" });
  }

  const order = await getOrder(checkoutRequestId);
  if (!order) {
    // Unknown id — could be from a cold start or a fake id.
    return res.status(200).json({ status: "unknown" });
  }

  return res.status(200).json({
    status: order.status,         // "pending" | "success" | "failed"
    amount: order.amount,
    phone: order.phone,
    receipt: order.receipt || null,
    resultDesc: order.resultDesc || null,
    resultCode: order.resultCode || null,
  });
};
