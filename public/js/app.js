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
    <a href="${waCartLink(items)}" target="_blank" rel="noopener"
       class="block text-center bg-[#25D366] text-white font-semibold py-3 rounded-full hover:opacity-90 transition">
      Checkout on WhatsApp
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
};