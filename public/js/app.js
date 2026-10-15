// ============================================
// Sole Vault — shared utilities + cart
// ============================================

const WHATSAPP_NUMBER = "254704587404";

// ---------- Price formatting ----------
function formatKsh(amount) {
  return "KSh " + amount.toLocaleString("en-KE");
}
function formatUsd(amount) {
  return "$" + amount.toLocaleString("en-US");
}

// ---------- WhatsApp link builders ----------
function waLink(message) {
  const text = encodeURIComponent(message || "Hi Sole Vault, I'd like to know more");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}
function waProductLink(product) {
  const msg = `Hi Sole Vault! I'm interested in the *${product.name}* (${formatKsh(product.priceKsh)}). Is it available?`;
  return waLink(msg);
}
function waCartLink(items) {
  const lines = items.map(i => `• ${i.qty}× ${i.name} (size ${i.size}) — ${formatKsh(i.priceKsh * i.qty)}`).join("\n");
  const total = items.reduce((s, i) => s + i.priceKsh * i.qty, 0);
  const msg = `Hi Sole Vault! I'd like to order:\n\n${lines}\n\nTotal: ${formatKsh(total)}`;
  return waLink(msg);
}

// ---------- Product data ----------
let _productsCache = null;
async function loadProducts() {
  if (_productsCache) return _productsCache;
  const res = await fetch("/data/products.json");
  if (!res.ok) throw new Error("Failed to load products");
  _productsCache = await res.json();
  return _productsCache;
}
async function getProductById(id) {
  const products = await loadProducts();
  return products.find(p => p.id === id);
}

// ---------- Product card renderer ----------
function productCardHtml(product) {
  return `
    <a href="/product.html?id=${product.id}" class="group block">
      <div class="aspect-square bg-vault-charcoal rounded-2xl overflow-hidden mb-4 relative">
        <img src="${product.image}" alt="${product.name}"
             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
             loading="lazy" />
        ${product.stock <= 8 ? `<span class="absolute top-3 left-3 bg-vault-gold text-vault-black text-xs font-semibold px-3 py-1 rounded-full">Only ${product.stock} left</span>` : ""}
      </div>
      <h3 class="font-display text-lg font-semibold group-hover:text-vault-gold transition">${product.name}</h3>
      <p class="text-vault-cream/60 text-sm mt-1">${formatKsh(product.priceKsh)} <span class="text-vault-cream/30">· ${formatUsd(product.priceUsd)}</span></p>
    </a>
  `;
}

// ============================================
// CART — localStorage-backed
// ============================================

const CART_KEY = "solevault_cart_v1";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCartBadge();
}

/**
 * Add a product to the cart.
 * Cart items are unique by (productId + size).
 */
function addToCart(product, size, qty = 1) {
  const cart = getCart();
  const existing = cart.find(i => i.id === product.id && i.size === size);

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      priceKsh: product.priceKsh,
      priceUsd: product.priceUsd,
      image: product.image,
      size,
      qty,
    });
  }
  saveCart(cart);
}

function removeFromCart(id, size) {
  const cart = getCart().filter(i => !(i.id === id && i.size === size));
  saveCart(cart);
}

function updateQty(id, size, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === id && i.size === size);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart(cart);
}

function cartTotal() {
  return getCart().reduce((s, i) => s + i.priceKsh * i.qty, 0);
}

function cartCount() {
  return getCart().reduce((s, i) => s + i.qty, 0);
}

function clearCart() {
  saveCart([]);
}

// ---------- Cart UI: badge in navbar ----------
function updateCartBadge() {
  const count = cartCount();
  document.querySelectorAll("[data-cart-count]").forEach(el => {
    el.textContent = count;
    el.classList.toggle("hidden", count === 0);
  });
}

// ---------- Cart UI: drawer ----------
function renderCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  if (!drawer) return;
  const items = getCart();
  const body = drawer.querySelector("[data-cart-body]");
  const footer = drawer.querySelector("[data-cart-footer]");

  if (items.length === 0) {
    body.innerHTML = `<p class="text-vault-cream/50 text-center py-12">Your cart is empty.</p>`;
    footer.innerHTML = "";
    return;
  }

  body.innerHTML = items.map(item => `
    <div class="flex gap-4 py-4 border-b border-white/5">
      <img src="${item.image}" alt="${item.name}" class="w-20 h-20 object-cover rounded-xl bg-vault-charcoal" />
      <div class="flex-1 min-w-0">
        <p class="font-semibold truncate">${item.name}</p>
        <p class="text-vault-cream/50 text-sm">Size ${item.size}</p>
        <div class="flex items-center gap-3 mt-2">
          <button data-qty-down="${item.id}|${item.size}" class="w-7 h-7 rounded-full border border-white/10 hover:border-vault-gold hover:text-vault-gold">−</button>
          <span class="text-sm w-6 text-center">${item.qty}</span>
          <button data-qty-up="${item.id}|${item.size}" class="w-7 h-7 rounded-full border border-white/10 hover:border-vault-gold hover:text-vault-gold">+</button>
          <button data-remove="${item.id}|${item.size}" class="ml-auto text-vault-cream/40 hover:text-red-400 text-sm">Remove</button>
        </div>
      </div>
      <p class="font-semibold text-vault-gold whitespace-nowrap">${formatKsh(item.priceKsh * item.qty)}</p>
    </div>
  `).join("");

    footer.innerHTML = `
    <div class="flex justify-between text-lg mb-4">
      <span class="text-vault-cream/60">Subtotal</span>
      <span class="font-display font-bold text-vault-gold">${formatKsh(cartTotal())}</span>
    </div>
    <a href="/checkout.html"
       class="block text-center bg-vault-gold text-vault-black font-semibold py-3 rounded-full hover:bg-vault-cream transition mb-2">
      Checkout with M-Pesa
    </a>
    <a href="${waCartLink(items)}" target="_blank" rel="noopener"
       class="block text-center border border-white/10 text-vault-cream font-semibold py-3 rounded-full hover:border-vault-gold hover:text-vault-gold transition">
      Order on WhatsApp instead
    </a>
    <button data-clear-cart class="block w-full text-center text-vault-cream/40 text-sm mt-3 hover:text-red-400">Clear cart</button>
  `;

  // wire up the small buttons
  body.querySelectorAll("[data-qty-up]").forEach(btn => {
    btn.addEventListener("click", () => {
      const [id, size] = btn.dataset.qtyUp.split("|");
      const item = getCart().find(i => i.id === id && i.size === size);
      updateQty(id, size, (item?.qty || 1) + 1);
      renderCartDrawer();
    });
  });
  body.querySelectorAll("[data-qty-down]").forEach(btn => {
    btn.addEventListener("click", () => {
      const [id, size] = btn.dataset.qtyDown.split("|");
      const item = getCart().find(i => i.id === id && i.size === size);
      if (item && item.qty > 1) {
        updateQty(id, size, item.qty - 1);
        renderCartDrawer();
      }
    });
  });
  body.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => {
      const [id, size] = btn.dataset.remove.split("|");
      removeFromCart(id, size);
      renderCartDrawer();
    });
  });
  footer.querySelector("[data-clear-cart]")?.addEventListener("click", () => {
    clearCart();
    renderCartDrawer();
  });
}

function openCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  if (!drawer) return;
  drawer.classList.remove("translate-x-full");
  document.getElementById("cart-overlay")?.classList.remove("hidden");
  renderCartDrawer();
}

function closeCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  if (!drawer) return;
  drawer.classList.add("translate-x-full");
  document.getElementById("cart-overlay")?.classList.add("hidden");
}

// ---------- Init on every page ----------
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  document.querySelectorAll("[data-open-cart]").forEach(el => {
    el.addEventListener("click", (e) => { e.preventDefault(); openCartDrawer(); });
  });
  document.querySelector("[data-close-cart]")?.addEventListener("click", closeCartDrawer);
  document.getElementById("cart-overlay")?.addEventListener("click", closeCartDrawer);
});

// ============================================
// CHATBOT — rule-based
// ============================================

// ---------- The rules ----------
// Each rule: { patterns: [...], reply: "...", quickReplies: [...], action?: "..." }
// A rule fires if the user's (lowercased) message contains ANY of the patterns.
const CHAT_RULES = [
  {
    intent: "greeting",
    patterns: ["hi", "hello", "hey", "habari", "sasa", "mambo", "good morning", "good afternoon"],
    reply: "Hi! 👋 Welcome to Sole Vault. I can help with products, prices, delivery, or connecting you to a human. What would you like?",
    quickReplies: ["Browse sneakers", "Delivery info", "Talk to a human"],
  },
  {
    intent: "browse",
    patterns: ["browse", "shop", "products", "sneakers", "shoes", "collection", "what do you have", "catalog"],
    reply: "We've got curated high-tops, runners, low-tops, and trail sneakers. Tap below to see the full collection.",
    quickReplies: ["Open shop page", "Recommend something", "Talk to a human"],
    action: "shop",
  },
  {
    intent: "recommend",
    patterns: ["recommend", "suggest", "best", "popular", "which one", "help me choose", "not sure"],
    reply: "Here are three pairs people love right now. Tap one to see details 👇",
    quickReplies: ["Show me bestsellers"],
    action: "recommend",
  },
  {
    intent: "price",
    patterns: ["price", "how much", "cost", "pesa", "bei"],
    reply: "Our sneakers range from KSh 6,200 to KSh 9,800, and we show USD prices too. Which product are you curious about?",
    quickReplies: ["Open shop page", "Recommend something", "Talk to a human"],
  },
  {
    intent: "delivery",
    patterns: ["deliver", "delivery", "shipping", "how long", "when will", "courier", "send to", "nairobi", "mombasa"],
    reply: "We deliver within Nairobi in 1–2 days, and countrywide in 3–5 days. Free delivery on orders above KSh 5,000. 📦",
    quickReplies: ["Browse sneakers", "Talk to a human"],
  },
  {
    intent: "payment",
    patterns: ["pay", "payment", "mpesa", "m-pesa", "mpesa", "card", "how do i pay", "checkout"],
    reply: "You can pay via M-Pesa on the checkout page — we send a prompt to your phone. You can also order directly on WhatsApp.",
    quickReplies: ["Browse sneakers", "Talk to a human"],
  },
  {
    intent: "returns",
    patterns: ["return", "refund", "exchange", "wrong size", "doesn't fit", "broken"],
    reply: "If the size isn't right, we'll exchange within 7 days — free of charge. Just keep the shoes unworn and in the box.",
    quickReplies: ["Talk to a human", "Browse sneakers"],
  },
  {
    intent: "sizes",
    patterns: ["size", "fit", "true to size", "larger", "smaller", "eu", "uk"],
    reply: "We use EU sizing, from 38 to 46 depending on the model. If you're between sizes, we recommend going half a size up for high-tops.",
    quickReplies: ["Browse sneakers", "Talk to a human"],
  },
  {
    intent: "authenticity",
    patterns: ["authentic", "real", "fake", "genuine", "original", "legit"],
    reply: "Every pair is authenticated before it leaves the vault. We don't stock replicas. Full stop. ✅",
    quickReplies: ["Browse sneakers", "Talk to a human"],
  },
  {
    intent: "stock",
    patterns: ["in stock", "available", "still have", "sold out", "size out"],
    reply: "Stock levels are shown on each product page. If something's out, message us on WhatsApp and we'll try to source it.",
    quickReplies: ["Open shop page", "Talk to a human"],
  },
  {
    intent: "order_status",
    patterns: ["my order", "track", "where is my", "hasn't arrived", "delivery status"],
    reply: "For order tracking, let's chat on WhatsApp so I can look up your specific order.",
    quickReplies: ["Talk to a human"],
    action: "human",
  },
  {
    intent: "contact",
    patterns: ["contact", "phone number", "email", "reach you", "location", "where are you"],
    reply: "We're in Nairobi and we're on WhatsApp the whole day. Tap below to open a chat.",
    quickReplies: ["Talk to a human"],
    action: "human",
  },
  {
    intent: "human",
    patterns: ["human", "agent", "person", "someone", "staff", "call", "whatsapp", "real person"],
    reply: "No problem — let's continue on WhatsApp so a real person can help you. 👇",
    quickReplies: [],
    action: "human",
  },
  {
    intent: "thanks",
    patterns: ["thank", "asante", "great", "cool", "awesome", "perfect"],
    reply: "Anytime! Anything else I can help with?",
    quickReplies: ["Browse sneakers", "Talk to a human"],
  },
  {
    intent: "bye",
    patterns: ["bye", "goodbye", "later", "kwaheri"],
    reply: "See you soon! 👟",
    quickReplies: [],
  },
  {
    intent: "fallback",
    patterns: [],
    reply: "I'm not sure I caught that. I can help with products, prices, delivery, sizes, and payment. Or I can connect you to a human.",
    quickReplies: ["Browse sneakers", "Talk to a human"],
  },
];

function findMatchingRule(userMessage) {
  const msg = userMessage.toLowerCase().trim();
  if (!msg) return CHAT_RULES.find(r => r.intent === "fallback");
  for (const rule of CHAT_RULES) {
    if (rule.intent === "fallback") continue;
    if (rule.patterns.some(p => msg.includes(p))) return rule;
  }
  return CHAT_RULES.find(r => r.intent === "fallback");
}

// ---------- Chat state ----------
let _chatHistory = [];

function addChatMessage(role, text, quickReplies, action) {
  _chatHistory.push({ role, text, quickReplies, action, ts: Date.now() });
  renderChatLog();
}

// ---------- Handlers for special actions ----------
function handleChatAction(action) {
  if (action === "shop") {
    setTimeout(() => { window.location.href = "/shop.html"; }, 600);
  } else if (action === "human") {
    const msg = "Hi Sole Vault! I was chatting with your bot and I'd like to speak to a human.";
    setTimeout(() => { window.open(waLink(msg), "_blank"); }, 600);
  } else if (action === "recommend") {
    showRecommendations();
  }
}

async function showRecommendations() {
  try {
    const products = await loadProducts();
    const picks = products.slice(0, 3);
    const text = "Here are our top picks this week:";
    _chatHistory.push({ role: "bot", text, ts: Date.now(), products: picks });
    renderChatLog();
  } catch (err) {
    addChatMessage("bot", "Couldn't load products right now — try again in a moment.");
  }
}

// ---------- Rendering ----------
function renderChatLog() {
  const log = document.getElementById("chat-log");
  if (!log) return;
  log.innerHTML = _chatHistory.map((m, idx) => {
    if (m.role === "user") {
      return `
        <div class="flex justify-end mb-3">
          <div class="max-w-[80%] bg-vault-gold text-vault-black rounded-2xl rounded-tr-sm px-4 py-2 text-sm">
            ${escapeHtml(m.text)}
          </div>
        </div>
      `;
    }
    // bot
    const quick = (m.quickReplies || []).map(q =>
      `<button data-quick="${escapeHtml(q)}" class="text-xs border border-vault-gold/40 text-vault-gold rounded-full px-3 py-1 hover:bg-vault-gold hover:text-vault-black transition">${escapeHtml(q)}</button>`
    ).join(" ");
    const products = (m.products || []).map(p => `
      <a href="/product.html?id=${p.id}" class="flex gap-3 items-center bg-vault-black/50 hover:bg-vault-black rounded-xl p-2 mt-2 transition">
        <img src="${p.image}" alt="${p.name}" class="w-12 h-12 object-cover rounded-lg" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">${escapeHtml(p.name)}</p>
          <p class="text-xs text-vault-gold">${formatKsh(p.priceKsh)}</p>
        </div>
      </a>
    `).join("");
    return `
      <div class="flex justify-start mb-3">
        <div class="max-w-[85%] bg-vault-smoke text-vault-cream rounded-2xl rounded-tl-sm px-4 py-2 text-sm">
          <div>${escapeHtml(m.text)}</div>
          ${products}
          ${quick ? `<div class="flex flex-wrap gap-2 mt-3">${quick}</div>` : ""}
        </div>
      </div>
    `;
  }).join("");

  // Wire up quick replies
  log.querySelectorAll("[data-quick]").forEach(btn => {
    btn.addEventListener("click", () => {
      const text = btn.dataset.quick;
      handleUserMessage(text);
    });
  });

  // Scroll to bottom
  log.scrollTop = log.scrollHeight;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

// ---------- User input ----------
function handleUserMessage(text) {
  if (!text || !text.trim()) return;
  addChatMessage("user", text.trim());
  const rule = findMatchingRule(text);

  // Short delay so it feels human
  setTimeout(() => {
    addChatMessage("bot", rule.reply, rule.quickReplies, rule.action);
    if (rule.action) handleChatAction(rule.action);
  }, 400);
}

// ---------- Panel open/close ----------
function openChat() {
  const panel = document.getElementById("chat-panel");
  if (!panel) return;
  panel.classList.remove("translate-y-full", "opacity-0", "pointer-events-none");
  document.getElementById("chat-bubble")?.classList.add("hidden");

  // Seed with greeting on first open
  if (_chatHistory.length === 0) {
    const greeting = CHAT_RULES.find(r => r.intent === "greeting");
    addChatMessage("bot", greeting.reply, greeting.quickReplies);
  }
}

function closeChat() {
  const panel = document.getElementById("chat-panel");
  if (!panel) return;
  panel.classList.add("translate-y-full", "opacity-0", "pointer-events-none");
  document.getElementById("chat-bubble")?.classList.remove("hidden");
}

// ---------- Init on every page ----------
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("chat-bubble")?.addEventListener("click", openChat);
  document.getElementById("chat-close")?.addEventListener("click", closeChat);

  const form = document.getElementById("chat-form");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("chat-input");
    if (!input) return;
    const text = input.value;
    input.value = "";
    handleUserMessage(text);
  });
});

// ---------- Export ----------
window.SV = {
  WHATSAPP_NUMBER,
  formatKsh, formatUsd,
  waLink, waProductLink, waCartLink,
  loadProducts, getProductById,
  productCardHtml,
  // cart
  getCart, addToCart, removeFromCart, updateQty,
  cartTotal, cartCount, clearCart,
  renderCartDrawer, openCartDrawer, closeCartDrawer, updateCartBadge,
  // chatbot
  openChat, closeChat, handleUserMessage,
};