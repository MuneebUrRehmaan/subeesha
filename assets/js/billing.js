/* =========================================================
   SUBEESHA - CHECKOUT (billing.html)
   ?product=<id>  -> buy a single product
   ?cart=1        -> checkout everything in the cart
   ========================================================= */
const $ = id => document.getElementById(id);
const money = n => "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-US");

let items = [];               // checkout lines
let cartMode = false;
let couponCode = "";
let couponDiscount = 0;
let walletDiscount = 0;
let shippingCfg = { charge: 250, freeAbove: 5000 };
let placing = false;

/* ---------- TOAST (escaped) ---------- */
function esc(v){ return SUB.esc(v); }
function showToast(title, message, type) {
    const container = $("toastContainer");
    if (!container) return;
    let icon = "checkmark-circle-outline";
    if (type === "error") icon = "close-circle-outline";
    if (type === "warning") icon = "warning-outline";
    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.innerHTML = `
        <ion-icon class="toast-icon" name="${icon}"></ion-icon>
        <div class="toast-content"><strong>${esc(title)}</strong><span>${esc(message)}</span></div>
        <button class="toast-close" onclick="removeToast(this)">×</button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add("hide"); setTimeout(() => toast.remove(), 350); }, 3500);
}
function removeToast(button) {
    const toast = button.closest(".toast");
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 350);
}

/* ---------- HEADER ---------- */
function handleHeaderSearch(event) {
    event.preventDefault();
    const search = $("headerSearchInput").value.trim();
    if (!search) return showToast("Warning", "Please enter something to search.", "warning");
    location.href = SUB.url("page/shop.html?search=" + encodeURIComponent(search));
}
function showCart() {
    if (!SUB.cart.count()) return showToast("Cart", "Your cart is empty.", "warning");
    location.href = SUB.url("page/billing.html?cart=1");
}
function toggleMenu() {
    const menu = $("navLinks");
    menu.classList.toggle("mobile-open");
    if (menu.classList.contains("mobile-open")) {
        menu.style.display = "flex"; menu.style.position = "absolute"; menu.style.top = "78px";
        menu.style.left = "0"; menu.style.width = "100%"; menu.style.padding = "20px";
        menu.style.background = "#fff"; menu.style.flexDirection = "column";
        menu.style.alignItems = "flex-start"; menu.style.boxShadow = "0 10px 25px rgba(0,0,0,.08)";
    } else {
        menu.removeAttribute("style");
    }
}

/* ---------- helpers ---------- */
function subtotal() { return items.reduce((s, i) => s + i.price * i.qty, 0); }
function shippingCost() { return SUB.shippingFor(subtotal(), shippingCfg); }
function cssColor(name) {
    const n = String(name).trim().toLowerCase();
    return (window.CSS && CSS.supports("color", n)) ? n : "#c9c9c9";
}
function setText(id, v) { const e = $(id); if (e) e.textContent = v; }

/* ---------- SINGLE PRODUCT VIEW ---------- */
function renderSingle() {
    const it = items[0], p = it.product;
    $("mainProductImage").src = SUB.img(it.image, 900);
    $("summaryImage").src = SUB.img(it.image, 300);
    setText("productName", it.name);
    setText("summaryName", it.name);
    setText("productPrice", money(it.price));
    const priceBox = document.querySelector(".product-info .price");
    if (priceBox) {
        const old = priceBox.querySelector(".old-price"), badge = priceBox.querySelector(".sale-badge");
        if (old) { old.textContent = money(it.old); old.style.display = it.old ? "" : "none"; }
        if (badge) { badge.textContent = it.pct + "% OFF"; badge.style.display = it.old ? "" : "none"; }
    }
    const rating = document.querySelector(".product-info .rating");
    if (rating) {
        if (p && p.rating > 0) {
            rating.querySelector(".stars").textContent = SUB.stars(p.rating);
            rating.querySelector("span:not(.stars)").textContent = p.rating + (p.reviewCount ? " (" + p.reviewCount + " Reviews)" : "");
        } else rating.style.display = "none";
    }
    const stock = document.querySelector(".product-info .stock");
    if (stock) {
        const s = it.stock;
        stock.innerHTML = s <= 0
            ? '<ion-icon name="close-circle"></ion-icon> Out of Stock'
            : '<ion-icon name="checkmark-circle"></ion-icon> ' + (s < 999 && s <= 10 ? "Only " + s + " left" : "In Stock");
        if (s <= 0) stock.style.color = "#c62828";
    }
    // colors
    const colors = (p && p.colors) || [];
    const titles = document.querySelectorAll(".option-title");
    const colorTitle = titles[0], colorBox = document.querySelector(".colors");
    if (colors.length) {
        colorBox.innerHTML = colors.map((c, i) =>
            `<button class="color-option${i === 0 ? " active" : ""}" onclick="selectColor('${esc(c).replace(/'/g, "")}','${esc(SUB.img((p.images || [])[i] || it.image, 900))}',this)" title="${esc(c)}"><span class="color-inner" style="background:${esc(cssColor(c))}"></span></button>`).join("");
        it.color = colors[0];
        setText("selectedColor", colors[0]); setText("summaryColor", colors[0]);
    } else {
        colorTitle.style.display = "none"; colorBox.style.display = "none";
        const sc = $("summaryColor"); if (sc) sc.parentElement.style.display = "none";
    }
    // sizes
    const sizes = (p && p.sizes) || [];
    const sizeTitle = titles[1], sizeBox = document.querySelector(".sizes");
    if (sizes.length) {
        sizeBox.innerHTML = sizes.map((s, i) =>
            `<button class="size${i === 0 ? " active" : ""}" onclick="selectSize('${esc(s).replace(/'/g, "")}',this)">${esc(s)}</button>`).join("");
        it.size = sizes[0];
        setText("selectedSize", sizes[0]); setText("summarySize", sizes[0]);
    } else {
        sizeTitle.style.display = "none"; sizeBox.style.display = "none";
        const ss = $("summarySize"); if (ss) ss.parentElement.style.display = "none";
    }
    setText("quantity", it.qty); setText("summaryQty", it.qty);
    setText("summaryPrice", money(it.price * it.qty));
}

function selectColor(color, image, button) {
    items[0].color = color;
    setText("selectedColor", color); setText("summaryColor", color);
    document.querySelectorAll(".color-option").forEach(x => x.classList.remove("active"));
    button.classList.add("active");
    const main = $("mainProductImage");
    main.classList.add("change");
    setTimeout(() => { main.src = image; main.classList.remove("change"); }, 180);
    $("summaryImage").src = image;
    renderSummaryProducts();
    showToast("Success", color + " color selected.", "success");
}
function selectSize(size, button) {
    items[0].size = size;
    setText("selectedSize", size); setText("summarySize", size);
    document.querySelectorAll(".size").forEach(x => x.classList.remove("active"));
    button.classList.add("active");
    renderSummaryProducts();
    showToast("Success", "Size " + size + " selected.", "success");
}
function changeQuantity(value) {
    const it = items[0];
    let q = it.qty + value;
    if (q < 1) q = 1;
    if (q > 10) { q = 10; showToast("Warning", "Maximum 10 items can be purchased.", "warning"); }
    if (q > it.stock) { q = Math.max(1, it.stock); showToast("Warning", "Only " + it.stock + " item(s) in stock.", "warning"); }
    it.qty = q;
    setText("quantity", q); setText("summaryQty", q);
    setText("summaryPrice", money(it.price * q));
    renderSummaryProducts();
    refreshCoupon().then(calculateTotal);
}

/* ---------- CART VIEW (many products) ---------- */
function renderCartLines() {
    const area = document.querySelector(".product-area");
    area.innerHTML = '<div id="cartLines" style="width:100%">' + items.map((it, i) => `
        <div class="cart-line" style="display:flex;gap:16px;align-items:center;padding:14px 0;border-bottom:1px solid #eee;flex-wrap:wrap">
            <img src="${esc(SUB.img(it.image, 200))}" alt="" style="width:78px;height:78px;border-radius:12px;object-fit:cover">
            <div style="flex:1;min-width:140px">
                <strong style="display:block">${esc(it.name)}</strong>
                <span style="color:#68736e;font-size:13px">${money(it.price)} each${it.stock < 999 && it.stock <= 10 ? " · only " + it.stock + " left" : ""}</span>
            </div>
            <div class="quantity-box" style="margin:0">
                <button class="qty-btn" onclick="cartQty(${i},-1)">−</button>
                <span class="qty-number">${it.qty}</span>
                <button class="qty-btn" onclick="cartQty(${i},1)">+</button>
            </div>
            <strong style="min-width:90px;text-align:right">${money(it.price * it.qty)}</strong>
            <button class="toast-close" style="color:#c62828" onclick="cartRemove(${i})" aria-label="Remove">×</button>
        </div>`).join("") + "</div>";
    const h = document.querySelector(".card-heading h2"), pp = document.querySelector(".card-heading p");
    if (h) h.textContent = "Your Cart";
    if (pp) pp.textContent = items.length + " item(s) ready for checkout";
}
function cartQty(i, delta) {
    const it = items[i];
    const q = it.qty + delta;
    if (q > 10) return showToast("Warning", "Maximum 10 items per product.", "warning");
    if (q > it.stock) return showToast("Warning", "Only " + it.stock + " item(s) in stock.", "warning");
    if (q < 1) return cartRemove(i);
    it.qty = q; syncCart(); renderCartLines(); renderSummaryProducts();
    refreshCoupon().then(calculateTotal);
}
function cartRemove(i) {
    items.splice(i, 1); syncCart();
    if (!items.length) { location.href = SUB.url("page/shop.html"); return; }
    renderCartLines(); renderSummaryProducts(); refreshCoupon().then(calculateTotal);
}
function syncCart() {
    SUB.cart.save(items.map(x => ({ id: x.id, name: x.name, price: x.price, image: x.image, qty: x.qty, color: x.color || "", size: x.size || "" })));
}

/* right-hand order summary lines */
function renderSummaryProducts() {
    const first = document.querySelector(".summary-product");
    if (!first) return;
    let box = $("summaryList");
    if (!box) {
        box = document.createElement("div"); box.id = "summaryList";
        first.parentNode.insertBefore(box, first); first.style.display = "none";
    }
    box.innerHTML = items.map(it => `
        <div class="summary-product">
            <img src="${esc(SUB.img(it.image, 300))}" alt="">
            <div class="summary-product-info">
                <strong>${esc(it.name)}</strong>
                ${it.color ? "<span>Color: <b>" + esc(it.color) + "</b></span>" : ""}
                ${it.size ? "<span>Size: <b>" + esc(it.size) + "</b></span>" : ""}
                <span>Qty: <b>${it.qty}</b></span>
            </div>
            <div class="summary-price">${money(it.price * it.qty)}</div>
        </div>`).join("");
}

/* ---------- COUPON ---------- */
function refreshCoupon() {
    if (!couponCode) { couponDiscount = 0; return Promise.resolve(); }
    return SUB.checkCoupon(couponCode, subtotal()).then(c => { couponDiscount = c.amount; })
        .catch(() => { couponDiscount = 0; couponCode = ""; $("coupon").value = ""; });
}
function applyCoupon() {
    const code = $("coupon").value.trim().toUpperCase();
    if (!code) return showToast("Warning", "Please enter a promo code.", "warning");
    if (!SUB.configured) return showToast("Error", "Store is not connected yet.", "error");
    if (!SUB.user) return showToast("Warning", "Please login to use a promo code.", "warning");
    SUB.checkCoupon(code, subtotal()).then(c => {
        couponCode = c.code; couponDiscount = c.amount;
        showToast("Success", c.label + " applied successfully.", "success");
        calculateTotal();
    }).catch(e => {
        couponCode = ""; couponDiscount = 0; calculateTotal();
        showToast("Error", e.message || "Invalid promo code.", "error");
    });
}

/* ---------- WALLET ---------- */
function walletBalance() { return SUB.profile ? Number(SUB.profile.wallet) || 0 : 0; }
function toggleWallet() {
    const checkbox = $("useWallet");
    if (checkbox.checked) {
        if (walletBalance() <= 0) {
            checkbox.checked = false;
            return showToast("Warning", "You have no wallet balance.", "warning");
        }
        showToast("Success", "Wallet balance applied.", "success");
    } else {
        showToast("Warning", "Wallet balance removed.", "warning");
    }
    calculateTotal();
}

/* ---------- TOTAL ---------- */
function calculateTotal() {
    const sub = subtotal(), ship = shippingCost();
    walletDiscount = $("useWallet") && $("useWallet").checked
        ? Math.min(walletBalance(), Math.max(0, sub + ship - couponDiscount)) : 0;
    const total = Math.max(0, sub + ship - couponDiscount - walletDiscount);
    if (!cartMode && items[0]) setText("productPrice", money(items[0].price));
    setText("summaryPrice", money(sub));
    setText("subtotal", money(sub));
    setText("shipping", ship === 0 ? "Free" : money(ship));
    setText("discount", "- " + money(couponDiscount));
    setText("walletDiscount", "- " + money(walletDiscount));
    setText("total", money(total));
}

/* ---------- PAYMENT ---------- */
function selectPayment(element) {
    document.querySelectorAll(".payment").forEach(item => {
        item.classList.remove("selected");
        item.querySelector(".payment-radio").checked = false;
    });
    element.classList.add("selected");
    element.querySelector(".payment-radio").checked = true;
}
function currentPayment() {
    const sel = document.querySelector(".payment.selected");
    return sel ? sel.querySelector(".payment-info strong").textContent.trim() : "Cash on Delivery";
}
function setupPayments(pay) {
    document.querySelectorAll(".payment").forEach(el => {
        const name = el.querySelector(".payment-info strong").textContent.trim();
        let allowed = true;
        if (name === "Cash on Delivery") allowed = pay.cod !== false;
        else if (name === "Easypaisa") allowed = pay.easypaisa !== false;
        else if (name === "JazzCash") allowed = pay.jazzcash !== false;
        else allowed = !!pay.online;       // card gateway is not integrated - hidden unless enabled
        if (!allowed) { el.remove(); return; }
        const num = name === "Easypaisa" ? pay.easypaisaNumber : name === "JazzCash" ? pay.jazzcashNumber : "";
        const inp = el.querySelector(".payment-body input");
        if (num && inp) {
            inp.placeholder = "Your " + name + " number / transaction ID";
            inp.insertAdjacentHTML("beforebegin", `<small style="display:block;margin-bottom:8px">Send payment to <b>${esc(num)}</b> and enter your number or transaction ID below.</small>`);
        }
        if (name.indexOf("Card") > -1 && inp) {
            // never collect raw card numbers on this site
            inp.outerHTML = "<small>Card payment is processed by our payment gateway after you place the order.</small>";
        }
    });
    const first = document.querySelector(".payment");
    if (first) selectPayment(first);
}

/* ---------- PLACE ORDER ---------- */
function placeOrder() {
    if (placing) return;
    const firstName = $("firstName").value.trim(), lastName = $("lastName").value.trim();
    const email = $("email").value.trim(), mobile = $("mobile").value.trim();
    const province = $("province").value, city = $("city").value, address = $("address").value.trim();

    if (!firstName || !lastName || !email || !mobile || !province || !city || !address)
        return showToast("Error", "Please complete all required fields.", "error");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return showToast("Error", "Please enter a valid email address.", "error");
    if (!/^[+\d][\d\s-]{8,}$/.test(mobile))
        return showToast("Error", "Please enter a valid mobile number.", "error");
    if (!SUB.configured) return showToast("Error", "Store is not connected to Firebase yet.", "error");
    if (!items.length) return showToast("Error", "No product selected.", "error");
    if (!SUB.user) {
        showToast("Login required", "Please login to place your order.", "warning");
        setTimeout(() => location.href = SUB.url("account.html?next=" + encodeURIComponent("page/billing.html" + location.search)), 1200);
        return;
    }
    const pm = currentPayment();
    let ref = "";
    const sel = document.querySelector(".payment.selected .payment-body input");
    if (sel) ref = sel.value.trim();
    if ((pm === "Easypaisa" || pm === "JazzCash") && !ref)
        return showToast("Error", "Please enter your " + pm + " number or transaction ID.", "error");

    placing = true;
    const btn = document.querySelector(".place-order");
    btn.disabled = true; btn.style.opacity = ".7";
    SUB.placeOrder({
        items: items.map(i => ({ id: i.id, qty: i.qty, color: i.color, size: i.size })),
        customer: { name: firstName + " " + lastName, email, phone: mobile, province, city, area: $("area").value.trim(), postal: $("postal").value.trim(), address },
        paymentMethod: pm, paymentRef: ref, coupon: couponCode,
        useWallet: $("useWallet").checked, source: "web", resellerCode: SUB.refCode()
    }).then(order => {
        if (cartMode) SUB.cart.clear();
        showToast("Order placed", "Your order " + order.orderNo + " has been placed successfully.", "success");
        setTimeout(() => location.href = SUB.url("page/profile.html#orders"), 1800);
    }).catch(e => {
        placing = false; btn.disabled = false; btn.style.opacity = "";
        showToast("Error", (e && e.message) || "Could not place the order.", "error");
    });
}

/* ---------- INIT ---------- */
function emptyState(msg) {
    document.querySelector(".product-area").innerHTML =
        `<div style="text-align:center;width:100%;padding:40px 10px"><ion-icon name="bag-handle-outline" style="font-size:54px;color:var(--primary)"></ion-icon><h3 style="margin:10px 0">${esc(msg)}</h3><a href="${SUB.url("page/shop.html")}" class="place-order" style="display:inline-flex;text-decoration:none;width:auto;padding:12px 26px">Continue Shopping</a></div>`;
    document.querySelector(".place-order").disabled = true;
    calculateTotal();
}

function prefill(profile) {
    if (!profile) return;
    const parts = (profile.name || "").split(" ");
    if (!$("firstName").value) $("firstName").value = parts.shift() || "";
    if (!$("lastName").value) $("lastName").value = parts.join(" ");
    if (!$("email").value) $("email").value = profile.email || "";
    if (!$("mobile").value) $("mobile").value = (profile.whatsapp || "").replace(/^\+92\s?/, "0");
    const a = (profile.addresses || [])[0];
    if (a) {
        if (a.province) $("province").value = a.province;
        if (a.city) $("city").value = a.city;
        if (a.area && !$("area").value) $("area").value = a.area;
        if (a.postal && !$("postal").value) $("postal").value = a.postal;
        if (a.address && !$("address").value) $("address").value = a.address;
    }
}

function lineFrom(p, qty, extra) {
    return Object.assign({ id: p.id, name: p.name, price: p._price, old: p._old, pct: p._pct, image: p._img,
        qty: qty || 1, stock: p._stock, color: "", size: "", product: p }, extra || {});
}

async function initCheckout() {
    if (!SUB.configured) { calculateTotal(); return; }   // static demo layout stays as-is
    cartMode = SUB.qs("cart") === "1";
    $("useWallet").checked = false;

    const [cat, ship, pay] = await Promise.all([SUB.catalog(), SUB.settings("shipping"), SUB.settings("payments")]);
    shippingCfg = ship;
    setupPayments(pay);

    if (cartMode) {
        const saved = SUB.cart.get();
        items = [];
        saved.forEach(s => {
            const p = cat.products.find(x => x.id === s.id);
            if (p && p._stock > 0) items.push(lineFrom(p, Math.min(s.qty, p._stock, 10), { color: s.color, size: s.size }));
        });
        if (!items.length) return emptyState("Your cart is empty");
        syncCart();
        renderCartLines();
    } else {
        const id = SUB.qs("product");
        let p = id ? cat.products.find(x => x.id === id) : null;
        if (id && !p) p = await SUB.getProduct(id).catch(() => null);
        if (!p) return emptyState("Product not found");
        const q = Math.max(1, Math.min(10, parseInt(SUB.qs("qty"), 10) || 1));
        items = [lineFrom(p, Math.min(q, Math.max(1, p._stock)))];
        renderSingle();
        if (p._stock <= 0) { document.querySelector(".place-order").disabled = true; showToast("Out of stock", p.name + " is currently unavailable.", "warning"); }
    }
    renderSummaryProducts();

    SUB.onAuth((user, profile) => {
        prefill(profile);
        const bal = walletBalance();
        const wp = document.querySelector(".wallet-price");
        if (wp) wp.textContent = money(bal);
        const wu = document.querySelector(".wallet-use");
        if (wu) wu.style.opacity = bal > 0 ? "" : ".55";
        calculateTotal();
    });
    calculateTotal();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initCheckout);
else initCheckout();
