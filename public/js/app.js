// ============================================
// Sole Vault — shared utilities
// ============================================

const WHATSAPP_NUMBER = "254704587404";
const API_BASE = ""; // same origin

// ---------- Price formatting ----------
function formatKsh(amount) {
  return "KSh " + amount.toLocaleString("en-KE");
}

function formatUsd(amount) {
  return "$" + amount.toLocaleString("en-US");
}

// ---------- WhatsApp link builders ----------

// Generic — chat with the store
function waLink(message) {
  const text = encodeURIComponent(message || "Hi Sole Vault, I'd like to know more");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

// Product-specific — used on product cards and detail page
function waProductLink(product) {
  const msg = `Hi Sole Vault! I'm interested in the *${product.name}* (${formatKsh(product.priceKsh)}). Is it available?`;
  return waLink(msg);
}

// Cart-specific — used at checkout (Step 6)
function waCartLink(items) {
  const lines = items.map(i => `• ${i.qty}× ${i.name} — ${formatKsh(i.priceKsh * i.qty)}`).join("\n");
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

// Export to window so plain HTML pages can use these without modules
window.SV = {
  WHATSAPP_NUMBER,
  formatKsh,
  formatUsd,
  waLink,
  waProductLink,
  waCartLink,
  loadProducts,
  getProductById,
  productCardHtml,
};