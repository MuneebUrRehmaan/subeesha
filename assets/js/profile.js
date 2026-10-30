
/* =========================================================
   SUBEESHA PROFILE PAGE JAVASCRIPT
   Frontend-only demo logic.
   Backend/API can replace these demo values later.
   ========================================================= */

const profileSections = document.querySelectorAll(".profile-section");
const profileNavItems = document.querySelectorAll(".profile-nav-item");

let rewardPoints = 0;
let walletBalance = 0;
let CONVERSION = 100;               // points per Rs. 1 (settings/rewards)
let me = null;                      // signed-in profile
const money = n => "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-US");
const fmtDate = t => SUB.date(t);


/* =========================================================
   PROFILE SECTION NAVIGATION
   ========================================================= */

function openSection(sectionId) {
    profileSections.forEach(section => {
        section.classList.toggle("active", section.id === sectionId);
    });

    profileNavItems.forEach(item => {
        item.classList.toggle("active", item.dataset.target === sectionId);
    });

    const titles = {
        overview: ["Welcome back, " + ((me && me.name) || "").split(" ")[0], "Manage your profile, orders, rewards and wallet from one place."],
        personal: ["Personal Information", "Update the information connected to your Subeesha account."],
        addresses: ["Address Book", "Manage your shipping and billing addresses."],
        orders: ["My Orders", "Track your recent purchases and order history."],
        earnings: ["My Earnings", "Earn points through shopping and activities, then request a wallet conversion."],
        wallet: ["My Wallet", "Manage your Subeesha wallet balance and wallet activity."],
        wishlist: ["My Wishlist", "Products you have saved for your next shopping trip."],
        reviews: ["My Reviews", "View the ratings and reviews you have submitted."],
        vouchers: ["Vouchers & Promo Codes", "Your available discounts and promotional vouchers."],
        payments: ["Payment Options", "Manage your saved payment methods."],
        security: ["Account & Security", "Keep your account information and login credentials secure."]
    };

    if (titles[sectionId]) {
        document.getElementById("pageTitle").textContent = titles[sectionId][0];
        document.getElementById("pageSubtitle").textContent = titles[sectionId][1];
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

profileNavItems.forEach(item => {
    item.addEventListener("click", () => {
        if (item.dataset.target === "loyalty") { location.href = "loyalty.html"; return; }
        openSection(item.dataset.target);
    });
});

function openPersonalSection() {
    openSection("personal");
}


/* =========================================================
   PROFILE SAVE (Firestore)
   ========================================================= */
function saveProfile() {
    if (!me) return;
    const f = document.querySelectorAll("#personal .field");
    const name = f[0].querySelector("input").value.trim();
    const phone = f[2].querySelector("input").value.trim();
    if (!name) return showToast("Error", "Full name is required.", "error");
    const data = {
        name: name, whatsapp: phone,
        gender: f[3].querySelector("select").value,
        birthday: f[4].querySelector("input").value
    };
    SUB.db.collection("users").doc(me.id).update(data).then(() => {
        Object.assign(me, data);
        fillUser();
        showToast("Success", "Profile information saved successfully.", "success");
    }).catch(e => showToast("Error", SUB.authError(e), "error"));
}

/* =========================================================
   REWARD / WALLET CONVERSION
   ========================================================= */

function openConvertModal() {
    document.getElementById("modalPoints").textContent = rewardPoints.toLocaleString();
    document.getElementById("convertPoints").value = 100;
    updateConversionPreview();

    document.getElementById("convertModal").classList.add("show");
    document.body.style.overflow = "hidden";
}

function closeConvertModal() {
    document.getElementById("convertModal").classList.remove("show");
    document.body.style.overflow = "";
}

function updateConversionPreview() {
    const input = document.getElementById("convertPoints");
    const preview = document.getElementById("conversionPreview");

    let points = Number(input.value) || 0;

    if (points < 0) {
        points = 0;
    }

    const rupees = points / 100;

    preview.textContent = `You will receive Rs. ${rupees.toFixed(2)}`;
}

document.getElementById("convertPoints").addEventListener("input", updateConversionPreview);

function submitConversion() {
    const input = document.getElementById("convertPoints");
    let points = Number(input.value);
    if (!points || points < CONVERSION || points % CONVERSION !== 0) {
        showToast("Warning", "Please enter points in multiples of " + CONVERSION + ".", "warning");
        return;
    }
    if (points > rewardPoints) {
        showToast("Error", "You do not have enough reward points.", "error");
        return;
    }
    const rupees = points / CONVERSION;
    SUB.db.collection("walletRequests").add({
        uid: me.id, name: me.name || "", email: me.email || "",
        points: points, amount: rupees, status: "Pending", createdAt: SUB.now()
    }).then(() => {
        closeConvertModal();
        showToast("Success", `Conversion request for Rs. ${rupees.toFixed(2)} has been submitted for admin approval.`, "success");
        loadEarnings();
    }).catch(e => showToast("Error", SUB.authError(e), "error"));
}

/* =========================================================
   TOAST NOTIFICATIONS
   Types: success, error, warning, info
   ========================================================= */

function showToast(title, message, type = "info") {
    const container = document.getElementById("toastContainer");

    const icons = {
        success: "checkmark-circle-outline",
        error: "alert-circle-outline",
        warning: "warning-outline",
        info: "information-circle-outline"
    };

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon">
                <ion-icon name="${icons[type] || icons.info}"></ion-icon>
            </div>

            <div>
                <div class="toast-title">${escapeHtml(title)}</div>
                <div class="toast-message">${escapeHtml(message)}</div>
            </div>

            <button class="toast-close" aria-label="Close notification">&times;</button>
        </div>

        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    const closeButton = toast.querySelector(".toast-close");

    closeButton.addEventListener("click", () => {
        removeToast(toast);
    });

    setTimeout(() => {
        removeToast(toast);
    }, 3500);
}

function removeToast(toast) {
    if (!toast || !toast.parentNode) return;

    toast.style.opacity = "0";
    toast.style.transform = "translateX(35px)";
    toast.style.transition = ".25s ease";

    setTimeout(() => {
        toast.remove();
    }, 250);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   VOUCHER COPY
   ========================================================= */

function copyCode(code) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(code);
    }

    showToast(
        "Success",
        `${code} copied to clipboard.`,
        "success"
    );
}


/* =========================================================
   MODAL CONTROLS
   ========================================================= */

document.getElementById("convertModal").addEventListener("click", function (event) {
    if (event.target === this) {
        closeConvertModal();
    }
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeConvertModal();
    }
});


/* =========================================================
   FIREBASE DATA
   ========================================================= */
const $id = id => document.getElementById(id);
const q1 = (sel, root) => (root || document).querySelector(sel);

function setPoints() {
    $id("overviewPoints").textContent = rewardPoints.toLocaleString();
    $id("earningsPoints").textContent = rewardPoints.toLocaleString();
    $id("modalPoints").textContent = rewardPoints.toLocaleString();
    $id("walletBalance").textContent = walletBalance.toFixed(2);
    $id("walletPreview").textContent = walletBalance.toFixed(2);
    $id("overviewWallet").textContent = `Rs. ${walletBalance.toFixed(2)}`;
}

function fillUser() {
    rewardPoints = Number(me.points) || 0;
    walletBalance = Number(me.wallet) || 0;
    setPoints();
    const first = (me.name || "").split(" ")[0];
    const av = q1(".user-summary .avatar"); if (av) av.textContent = SUB.initials(me.name);
    const h = q1(".user-summary h2"); if (h) h.textContent = me.name || "";
    const pm = q1(".user-summary p"); if (pm) pm.textContent = me.email || "";
    $id("pageTitle").textContent = "Welcome back, " + first;
    const det = document.querySelectorAll("#overview .profile-details strong");
    if (det.length >= 4) {
        det[0].textContent = me.name || "-"; det[1].textContent = me.email || "-";
        det[2].textContent = me.whatsapp || "-"; det[3].textContent = me.gender || "-";
    }
    const f = document.querySelectorAll("#personal .field");
    f[0].querySelector("input").value = me.name || "";
    f[1].querySelector("input").value = me.email || "";
    f[1].querySelector("input").readOnly = true;
    f[2].querySelector("input").value = me.whatsapp || "";
    f[3].querySelector("select").value = me.gender || "Male";
    f[4].querySelector("input").value = me.birthday || "";
    const sec = document.querySelectorAll("#security .security-card p");
    if (sec[1]) sec[1].textContent = me.email || "";
    if (sec[2]) sec[2].textContent = me.whatsapp || "-";
    const wid = q1(".wallet-footer span"); if (wid) wid.textContent = "Wallet ID: SUB-WLT-" + String(me.id).slice(0, 6).toUpperCase();
}

const emptyBox = t => `<p style="color:#68736e;padding:18px 4px;font-size:14px">${SUB.esc(t)}</p>`;
const statusClass = s => ({ Delivered: "delivered", Cancelled: "cancelled", Returned: "cancelled" }[s] || "processing");
let allOrders = [];

function orderRow(o) {
    const trackable = ["Pending", "Processing", "Shipped"].indexOf(o.status) > -1;
    return `<div class="order-row" data-status="${SUB.esc(o.status)}">
        <strong>#${SUB.esc(o.orderNo || o.id)}</strong>
        <span>${fmtDate(o.createdAt)}</span>
        <span>${money(o.total)}</span>
        <span class="status ${statusClass(o.status)}">${SUB.esc(o.status)}</span>
        <button onclick="viewOrder('${SUB.esc(o.id)}')">${trackable ? "Track" : "View"}</button></div>`;
}

function renderOrders(filter) {
    const box = q1("#orders .order-table");
    const head = box.querySelector(".order-head").outerHTML;
    let list = allOrders;
    if (filter === "Processing") list = list.filter(o => ["Pending", "Processing", "Shipped"].indexOf(o.status) > -1);
    else if (filter === "Delivered" || filter === "Cancelled") list = list.filter(o => o.status === filter);
    else if (filter === "Returns") list = list.filter(o => o.status === "Returned");
    box.innerHTML = head + (list.length ? list.map(orderRow).join("") : emptyBox("No orders found."));
}
document.querySelectorAll("#orders .order-tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("#orders .order-tabs button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderOrders(btn.textContent.trim().replace("All Orders", "All"));
    });
});

function modal(html) {
    let m = $id("dynModal");
    if (!m) {
        m = document.createElement("div");
        m.className = "modal-overlay"; m.id = "dynModal";
        m.addEventListener("click", e => { if (e.target === m) closeDyn(); });
        document.body.appendChild(m);
    }
    m.innerHTML = '<div class="modal-card" style="max-height:88vh;overflow:auto"><button class="modal-close" onclick="closeDyn()" aria-label="Close"><ion-icon name="close-outline"></ion-icon></button>' + html + "</div>";
    m.classList.add("show"); document.body.style.overflow = "hidden";
}
function closeDyn() {
    const m = $id("dynModal"); if (m) m.classList.remove("show");
    document.body.style.overflow = "";
}

function viewOrder(id) {
    const o = allOrders.find(x => x.id === id); if (!o) return;
    const lines = (o.items || []).map(i => `<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #eee"><span>${SUB.esc(i.name)} × ${i.qty}${i.color ? " · " + SUB.esc(i.color) : ""}${i.size ? " · " + SUB.esc(i.size) : ""}</span><b>${money(i.price * i.qty)}</b></div>`).join("");
    const steps = ["Pending", "Processing", "Shipped", "Delivered"];
    const idx = steps.indexOf(o.status);
    const track = o.status === "Cancelled" || o.status === "Returned"
        ? `<p style="color:#c62828;font-weight:700">This order is ${SUB.esc(o.status)}.</p>`
        : `<div style="display:flex;gap:6px;margin:12px 0">${steps.map((s, i) => `<div style="flex:1;text-align:center;font-size:12px;font-weight:700;padding:8px 2px;border-radius:4px;background:${i <= idx ? "#0e3d34" : "#eef2f0"};color:${i <= idx ? "#fff" : "#68736e"}">${s}</div>`).join("")}</div>`;
    const c = o.customer || {};
    modal(`<span class="eyebrow">ORDER</span><h2>#${SUB.esc(o.orderNo || o.id)}</h2><p>${fmtDate(o.createdAt)} · ${SUB.esc(o.paymentMethod || "")}</p>${track}${lines}
        <div style="padding-top:10px;font-size:14px;line-height:1.9">
        <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between"><span>Shipping</span><span>${o.shipping ? money(o.shipping) : "Free"}</span></div>
        ${o.discount ? `<div style="display:flex;justify-content:space-between"><span>Discount</span><span>- ${money(o.discount)}</span></div>` : ""}
        ${o.walletUsed ? `<div style="display:flex;justify-content:space-between"><span>Wallet</span><span>- ${money(o.walletUsed)}</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;font-weight:800;font-size:16px"><span>Total</span><span>${money(o.total)}</span></div></div>
        <p style="margin-top:14px;font-size:13px;color:#68736e">Deliver to: ${SUB.esc(c.name || "")}, ${SUB.esc(c.address || "")}, ${SUB.esc(c.city || "")}</p>
        ${o.status === "Pending" ? '<div class="modal-actions"><button class="outline-btn" onclick="cancelOrder(\'' + SUB.esc(o.id) + '\')">Cancel Order</button></div>' : ""}`);
}
function cancelOrder(id) {
    if (!confirm("Cancel this order?")) return;
    SUB.db.collection("orders").doc(id).update({ status: "Cancelled", updatedAt: SUB.now() }).then(() => {
        const o = allOrders.find(x => x.id === id); if (o) o.status = "Cancelled";
        closeDyn(); renderOrders("All"); showToast("Success", "Your order has been cancelled.", "success");
    }).catch(e => showToast("Error", SUB.authError(e), "error"));
}

function loadOrders() {
    return SUB.db.collection("orders").where("userId", "==", me.id).get().then(snap => {
        allOrders = SUB.docs(snap).sort((a, b) => SUB.ms(b.createdAt) - SUB.ms(a.createdAt));
        renderOrders("All");
        const stats = document.querySelectorAll("#overview .stats-grid .stat-card");
        const active = allOrders.filter(o => ["Pending", "Processing", "Shipped"].indexOf(o.status) > -1).length;
        stats[0].querySelector("strong").textContent = allOrders.length;
        stats[0].querySelector("small").textContent = active + " currently active";
    });
}

function earnRow(icon, title, sub, pts, cls) {
    return `<div class="earning-row ${cls || ""}"><div class="earning-icon"><ion-icon name="${icon}"></ion-icon></div>
        <div class="earning-info"><strong>${SUB.esc(title)}</strong><span>${sub}</span></div><b>${pts > 0 ? "+" : ""}${pts.toLocaleString()} Points</b></div>`;
}
const reasonIcon = r => /login/i.test(r) ? "log-in-outline" : /review/i.test(r) ? "star-outline" : /refer/i.test(r) ? "people-outline" : "bag-handle-outline";

function loadEarnings() {
    return Promise.all([
        SUB.db.collection("rewardLog").where("uid", "==", me.id).get(),
        SUB.db.collection("walletRequests").where("uid", "==", me.id).get()
    ]).then(r => {
        const log = SUB.docs(r[0]).map(x => ({ t: x.createdAt, title: x.reason, sub: fmtDate(x.createdAt) + (x.note ? " · " + SUB.esc(x.note) : ""), pts: Number(x.points) || 0, icon: reasonIcon(x.reason || "") }));
        const reqs = SUB.docs(r[1]);
        const conv = reqs.filter(x => x.status === "Approved" || x.status === "Pending").map(x => ({
            t: x.createdAt, title: "Wallet Conversion " + (x.status === "Pending" ? "(Pending)" : ""),
            sub: fmtDate(x.createdAt) + " · " + x.points + " points", pts: -x.points, icon: "wallet-outline", cls: "converted", real: x.status === "Approved" }));
        const rows = log.concat(conv).sort((a, b) => SUB.ms(b.t) - SUB.ms(a.t));
        const html = rows.length ? rows.map(x => earnRow(x.icon, x.title, x.sub, x.pts, x.cls)).join("") : emptyBox("No points activity yet. Log in daily, shop and review products to earn points!");
        q1("#earnings .earning-list").innerHTML = html;
        q1("#overview .earning-list").innerHTML = rows.length ? rows.slice(0, 3).map(x => earnRow(x.icon, x.title, x.sub, x.pts, x.cls)).join("") : emptyBox("No points activity yet.");
        const earned = log.filter(x => x.pts > 0).reduce((s, x) => s + x.pts, 0);
        const converted = reqs.filter(x => x.status === "Approved").reduce((s, x) => s + x.points, 0);
        const st = document.querySelectorAll("#earnings .rewards-stats .stat-card strong");
        if (st[1]) st[1].textContent = earned.toLocaleString();
        if (st[2]) st[2].textContent = converted.toLocaleString();
    }).catch(() => { });
}

function loadWallet() {
    return SUB.db.collection("walletTransactions").where("uid", "==", me.id).get().then(snap => {
        const tx = SUB.docs(snap).sort((a, b) => SUB.ms(b.createdAt) - SUB.ms(a.createdAt));
        q1("#wallet .wallet-transactions").innerHTML = tx.length ? tx.map(t => {
            const plus = Number(t.amount) >= 0;
            return `<div class="transaction-row"><div class="transaction-icon ${plus ? "plus" : "minus"}"><ion-icon name="${plus ? "add-outline" : "cart-outline"}"></ion-icon></div>
                <div><strong>${SUB.esc(t.title || "Wallet")}</strong><span>${fmtDate(t.createdAt)}</span></div>
                <b class="${plus ? "positive" : "negative"}">${plus ? "+" : "-"}Rs. ${Math.abs(Number(t.amount)).toFixed(2)}</b></div>`;
        }).join("") : emptyBox("No wallet transactions yet.");
    }).catch(() => { });
}

function loadWishlist() {
    return SUB.catalog().then(c => {
        const ids = SUB.wish.get();
        const items = ids.map(id => c.products.find(p => p.id === id)).filter(Boolean);
        window.__products = c.products;
        const grid = q1("#wishlist .wishlist-grid");
        const stat = document.querySelectorAll("#overview .stats-grid .stat-card")[3];
        if (stat) stat.querySelector("strong").textContent = items.length;
        grid.innerHTML = items.length ? items.map(p => `<article class="wishlist-card"><div class="wishlist-image">
            <img src="${SUB.esc(SUB.img(p._img, 700))}" alt="${SUB.esc(p.name)}">
            <button onclick="removeWish('${SUB.esc(p.id)}')" aria-label="Remove wishlist item"><ion-icon name="heart"></ion-icon></button></div>
            <div class="wishlist-body"><span>${SUB.esc(p.category || "")}</span><h3>${SUB.esc(p.name)}</h3><strong>${money(p._price)}</strong>
            <button class="primary-btn full-btn" onclick="wishToCart('${SUB.esc(p.id)}')">Add to Cart</button></div></article>`).join("")
            : emptyBox("Your wishlist is empty. Tap the heart on any product to save it here.");
    });
}
function removeWish(id) { SUB.wish.toggle(id); loadWishlist(); showToast("Success", "Product removed from wishlist.", "success"); }
function wishToCart(id) {
    const p = (window.__products || []).find(x => x.id === id); if (!p) return;
    if (p._stock <= 0) return showToast("Error", "This product is out of stock.", "error");
    SUB.cart.add({ id: p.id, name: p.name, price: p._price, image: p._img, qty: 1 });
    showToast("Success", "Product added to cart.", "success");
}

function loadReviews() {
    return SUB.db.collection("reviews").where("uid", "==", me.id).get().then(snap => {
        const rv = SUB.docs(snap).sort((a, b) => SUB.ms(b.createdAt) - SUB.ms(a.createdAt));
        const box = $id("reviews");
        box.querySelectorAll(".review-item").forEach(x => x.remove());
        box.insertAdjacentHTML("beforeend", rv.length ? rv.map(r => `<article class="panel review-item"><div class="review-stars">${SUB.stars(r.rating)}</div>
            <h3>${SUB.esc(r.product || "Subeesha")}</h3><p>"${SUB.esc(r.review)}"</p>
            <span>Reviewed on ${fmtDate(r.createdAt)} · ${r.status === "approved" ? "Published" : r.status === "rejected" ? "Rejected" : "Awaiting approval"}</span></article>`).join("")
            : emptyBox("You have not written any reviews yet."));
    }).catch(() => { });
}

function loadVouchers() {
    return SUB.db.collection("discounts").where("public", "==", true).get().then(snap => {
        const v = SUB.docs(snap).filter(x => x.active && (!x.expiresAt || SUB.ms(x.expiresAt) > Date.now()));
        q1("#vouchers .voucher-grid").innerHTML = v.length ? v.map(x => `<article class="voucher-card"><div class="voucher-left"><span>SUBEESHA</span>
            <strong>${x.type === "fixed" ? "Rs. " + x.value + " OFF" : x.value + "% OFF"}</strong>
            <small>${x.minOrder ? "Minimum order " + money(x.minOrder) : SUB.esc(x.description || "")}</small></div>
            <div class="voucher-code"><strong>${SUB.esc(x.id)}</strong><button onclick="copyCode('${SUB.esc(x.id)}')">Copy</button></div></article>`).join("")
            : emptyBox("No vouchers available right now.");
    }).catch(() => { });
}

/* ----- address book ----- */
function saveAddresses(list) {
    return SUB.db.collection("users").doc(me.id).update({ addresses: list }).then(() => { me.addresses = list; renderAddresses(); });
}
function renderAddresses() {
    const list = me.addresses || [];
    const grid = q1("#addresses .address-grid");
    grid.innerHTML = list.length ? list.map((a, i) => `<article class="address-card ${a.default ? "default" : ""}">
        <div class="address-head"><div><span class="address-label"><ion-icon name="${/office/i.test(a.label) ? "business-outline" : "home-outline"}"></ion-icon> ${SUB.esc((a.label || "Home").toUpperCase())}</span>
        <h3>${SUB.esc(a.name || me.name)}</h3></div>${a.default ? '<span class="default-badge">Default</span>' : ""}</div>
        <p>${SUB.esc(a.phone || "")}</p><p>${SUB.esc(a.address || "")}${a.area ? ", " + SUB.esc(a.area) : ""}</p><p>${SUB.esc(a.city || "")}, ${SUB.esc(a.province || "")}, Pakistan</p>
        <div class="address-actions"><button onclick="editAddress(${i})">Edit</button>
        ${a.default ? "" : `<button onclick="defaultAddress(${i})">Set Default</button><button onclick="deleteAddress(${i})">Delete</button>`}</div></article>`).join("")
        : emptyBox("No saved addresses yet. Add one to speed up checkout.");
}
function editAddress(i) {
    const a = i == null ? {} : (me.addresses || [])[i] || {};
    const provinces = ["Sindh", "Punjab", "Balochistan", "Khyber Pakhtunkhwa", "Islamabad Capital Territory", "Gilgit-Baltistan", "Azad Kashmir"];
    modal(`<span class="eyebrow">DELIVERY</span><h2>${i == null ? "Add New" : "Edit"} Address</h2>
        <div class="field"><label>Label (Home / Office)</label><input id="adLabel" value="${SUB.esc(a.label || "Home")}"></div>
        <div class="field"><label>Full Name</label><input id="adName" value="${SUB.esc(a.name || me.name || "")}"></div>
        <div class="field"><label>Phone</label><input id="adPhone" value="${SUB.esc(a.phone || me.whatsapp || "")}"></div>
        <div class="field"><label>Province</label><select id="adProv">${provinces.map(p => `<option${a.province === p ? " selected" : ""}>${p}</option>`).join("")}</select></div>
        <div class="field"><label>City</label><input id="adCity" value="${SUB.esc(a.city || "")}"></div>
        <div class="field"><label>Area</label><input id="adArea" value="${SUB.esc(a.area || "")}"></div>
        <div class="field"><label>Postal Code</label><input id="adPostal" value="${SUB.esc(a.postal || "")}"></div>
        <div class="field"><label>Complete Address</label><input id="adAddr" value="${SUB.esc(a.address || "")}"></div>
        <div class="modal-actions"><button class="outline-btn" onclick="closeDyn()">Cancel</button><button class="primary-btn" onclick="submitAddress(${i == null ? "null" : i})">Save Address</button></div>`);
}
function submitAddress(i) {
    const a = {
        label: $id("adLabel").value.trim() || "Home", name: $id("adName").value.trim(), phone: $id("adPhone").value.trim(),
        province: $id("adProv").value, city: $id("adCity").value.trim(), area: $id("adArea").value.trim(),
        postal: $id("adPostal").value.trim(), address: $id("adAddr").value.trim()
    };
    if (!a.name || !a.city || !a.address) return showToast("Error", "Name, city and address are required.", "error");
    const list = (me.addresses || []).slice();
    if (i == null) { a.default = list.length === 0; list.push(a); } else { a.default = !!list[i].default; list[i] = a; }
    saveAddresses(list).then(() => { closeDyn(); showToast("Success", "Address saved.", "success"); })
        .catch(e => showToast("Error", SUB.authError(e), "error"));
}
function defaultAddress(i) { saveAddresses((me.addresses || []).map((a, x) => Object.assign({}, a, { default: x === i }))).then(() => showToast("Success", "Default address updated.", "success")); }
function deleteAddress(i) { const l = (me.addresses || []).slice(); l.splice(i, 1); saveAddresses(l).then(() => showToast("Success", "Address removed.", "success")); }

/* ----- payment options (read-only: shows what the store accepts) ----- */
function loadPayments() {
    return SUB.settings("payments").then(p => {
        const rows = [];
        if (p.cod !== false) rows.push(["cash-outline", "Cash on Delivery", "Pay when your order arrives", "Available"]);
        if (p.easypaisa !== false) rows.push(["phone-portrait-outline", "Easypaisa", p.easypaisaNumber ? "Send to " + p.easypaisaNumber : "Pay using Easypaisa", "Available"]);
        if (p.jazzcash !== false) rows.push(["phone-portrait-outline", "JazzCash", p.jazzcashNumber ? "Send to " + p.jazzcashNumber : "Pay using JazzCash", "Available"]);
        q1("#payments .payment-list").innerHTML = rows.map(r => `<article class="payment-card"><div class="payment-icon"><ion-icon name="${r[0]}"></ion-icon></div>
            <div><strong>${r[1]}</strong><span>${SUB.esc(r[2])}</span></div><span class="connected-badge">${r[3]}</span></article>`).join("");
        const btn = q1("#payments .section-title button"); if (btn) btn.style.display = "none";
        const sub = q1("#payments .section-title p"); if (sub) sub.textContent = "Payment methods accepted at checkout. Card details are never stored on this site.";
    });
}

function wireStaticButtons() {
    const add = q1("#addresses .section-title button");
    if (add) add.setAttribute("onclick", "editAddress(null)");
    const lo = q1(".logout-btn");
    if (lo) lo.setAttribute("onclick", "logout()");
    const sec = document.querySelectorAll("#security .security-card button");
    if (sec[0]) sec[0].setAttribute("onclick", "changePassword()");
    if (sec[1]) sec[1].style.display = "none";
    if (sec[2]) sec[2].style.display = "none";
    const soc = document.querySelectorAll("#security .security-card")[3]; if (soc) soc.style.display = "none";
}
function changePassword() {
    SUB.resetPassword(me.email).then(() => showToast("Success", "Password reset link sent to " + me.email, "success"))
        .catch(e => showToast("Error", SUB.authError(e), "error"));
}
function logout() { SUB.signOut().then(() => location.href = "../account.html?stay=1"); }

async function initProfile() {
    const done = () => document.body.classList.remove("pf-loading");
    setTimeout(done, 8000);
    wireStaticButtons();
    if (!SUB.configured) { setPoints(); done(); return; }        // static demo when not connected
    const { user, profile } = await SUB.ready;
    if (!user || !profile) { location.href = "../account.html?next=" + encodeURIComponent("page/profile.html"); return; }
    if (profile.role === "admin") { location.href = "../panel/admin/index.html"; return; }
    if (profile.role === "reseller") { location.href = "../panel/reseller/dashboard.html"; return; }
    me = profile;
    SUB.settings("rewards").then(r => { CONVERSION = Number(r.conversion) || 100; });
    fillUser(); renderAddresses();
    Promise.allSettled([loadOrders(), loadEarnings(), loadWallet(), loadWishlist(), loadReviews(), loadVouchers(), loadPayments()]).then(done);
    if (location.hash && $id(location.hash.slice(1))) openSection(location.hash.slice(1));
    // refresh points/wallet after the daily reward is granted
    SUB.onAuth((u, p) => { if (p && me && p.id === me.id) { me = p; fillUser(); loadEarnings(); } });
}
initProfile();
