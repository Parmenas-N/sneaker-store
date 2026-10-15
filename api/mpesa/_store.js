// api/mpesa/_store.js
// Upstash Redis-backed store for M-Pesa order statuses.
// This works across serverless instances, unlike the previous in-memory Map.

const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Keys are prefixed so they don't collide with anything else in the DB.
function key(checkoutRequestId) {
  return `order:${checkoutRequestId}`;
}

async function setOrder(checkoutRequestId, data) {
  await redis.set(key(checkoutRequestId), JSON.stringify({
    ...data,
    updatedAt: Date.now(),
  }), { ex: 60 * 60 * 24 }); // 24h TTL — orders expire after a day
}

async function getOrder(checkoutRequestId) {
  const raw = await redis.get(key(checkoutRequestId));
  if (!raw) return null;
  // Upstash returns the value as-is if it was stored as a string.
  // We stored JSON.stringify, so parse it back.
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

async function updateOrder(checkoutRequestId, patch) {
  const existing = (await getOrder(checkoutRequestId)) || {};
  await setOrder(checkoutRequestId, { ...existing, ...patch });
}

// Housekeeping is now handled by Redis TTL (ex: 24h), so this is a no-op.
async function cleanup() {
  return;
}

module.exports = { setOrder, getOrder, updateOrder, cleanup };