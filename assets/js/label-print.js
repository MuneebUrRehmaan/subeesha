/* =========================================================
   SUBEESHA - ORDER SHIPPING LABEL
   Usage:  label-print.html?id=SUB-10842   (admin / staff only)
   Loads the order from Firestore and builds the label + QR.
   ========================================================= */
const money = n => "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-US");
const $q = (s) => document.querySelector(s);
const E = v => SUB.esc(v);

function buildQr(text){
    const box = document.getElementById("qrcode");
    box.innerHTML = "";
    new QRCode(box, { text: text, width: 120, height: 120, correctLevel: QRCode.CorrectLevel.H });
}

function fillLabel(o, store){
    const c = o.customer || {};
    const no = o.orderNo || o.id;
    const cod = /cash/i.test(o.paymentMethod || "");
    const collect = cod ? o.total : 0;

    const boxes = document.querySelectorAll(".order-bar .order-box strong");
    boxes[0].textContent = "#" + no;
    boxes[1].textContent = SUB.date(o.createdAt);
    boxes[2].textContent = o.paymentMethod || "-";

    $q(".customer-name").textContent = c.name || "";
    $q(".customer-phone").textContent = c.phone || "";
    $q(".customer-address").innerHTML = [c.address, c.area, [c.city, c.province, "Pakistan"].filter(Boolean).join(", ")]
        .filter(Boolean).map(E).join(",<br>");

    // sender / store details
    const wi = document.querySelectorAll(".website-info p");
    if (wi[1]) wi[1].textContent = store.email || "";
    if (wi[2]) wi[2].textContent = store.phone || "";
    $q(".return-name").textContent = (store.name || "Subeesha") + " Online Store";
    $q(".return-phone").textContent = store.phone || "";
    $q(".return-details").innerHTML = String(store.address || "").split(",").map(x => E(x.trim())).filter(Boolean).join(",<br>");

    const rows = document.querySelectorAll(".summary-section .summary-row");
    rows[0].querySelector("strong").textContent = money(o.subtotal);
    rows[1].querySelector("strong").textContent = o.shipping ? money(o.shipping) : "Free";
    rows[2].querySelector("strong").textContent = o.couponCode || "None";
    rows[3].querySelector("strong").textContent = o.discount ? "- " + money(o.discount) : "- Rs. 0";
    rows[4].querySelector("strong").textContent = o.walletUsed ? "- " + money(o.walletUsed) : "Not Used";
    $q(".total-row strong").textContent = money(o.total);
    $q(".qr-order").textContent = "#" + no;
    $q(".cod-box strong").textContent = money(collect);
    if (!cod) $q(".cod-box span").textContent = "Prepaid / Nothing to collect";

    const items = (o.items || []).map(i => i.name + " x" + i.qty).join(", ");
    buildQr([
        "SUBEESHA - QUALITY POINTS", "Visit https://subeesha.com and upload this QR code to earn Quality Points.", "",
        "SUBEESHA ORDER DETAILS", "",
        "Order Number: " + no, "Order Date: " + SUB.date(o.createdAt), "Payment Method: " + (o.paymentMethod || ""), "",
        "CUSTOMER", "Name: " + (c.name || ""), "Phone: " + (c.phone || ""),
        "Address: " + [c.address, c.area, c.city, c.province].filter(Boolean).join(", "), "",
        "ITEMS: " + items, "",
        "Subtotal: " + money(o.subtotal), "Shipping: " + money(o.shipping),
        "Discount: " + money(o.discount), "Total: " + money(o.total), "Amount To Collect: " + money(collect)
    ].join("\n"));
    document.title = "Label " + no + " - Subeesha";
    makeEditable(no, items);
}

/* click-to-edit fields; QR is rebuilt from whatever is on the label */
function makeEditable(no, items){
    const sel = ".customer-name,.customer-phone,.customer-address,.return-name,.return-phone,.return-details,.website-info p,.order-bar .order-box strong,.summary-section .summary-row strong,.total-row strong,.cod-box strong,.cod-box span,.qr-order";
    const t = s => ($q(s) ? $q(s).innerText.replace(/\s+/g, " ").trim() : "");
    let timer = null;
    const rebuild = () => buildQr([
        "SUBEESHA - QUALITY POINTS", "Visit https://subeesha.com and upload this QR code to earn Quality Points.", "",
        "SUBEESHA ORDER DETAILS", "", "Order Number: " + t(".qr-order").replace(/^#/, ""), "",
        "CUSTOMER", "Name: " + t(".customer-name"), "Phone: " + t(".customer-phone"), "Address: " + t(".customer-address"), "",
        "ITEMS: " + items, "", "Total: " + t(".total-row strong"), "Amount To Collect: " + t(".cod-box strong")
    ].join("\n"));
    document.querySelectorAll(sel).forEach(el => {
        el.setAttribute("contenteditable", "true"); el.setAttribute("spellcheck", "false");
        el.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(rebuild, 500); });
        el.addEventListener("paste", e => { e.preventDefault(); document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text")); });
        el.addEventListener("keydown", e => { if (e.key === "Enter" && !el.classList.contains("customer-address") && !el.classList.contains("return-details")) { e.preventDefault(); el.blur(); } });
    });
}

function fail(msg){
    document.querySelector(".shipping-label").innerHTML =
        '<div style="padding:40px;text-align:center;font-size:16px">' + E(msg) + "</div>";
}

(function init(){
    if (!SUB.configured) {          // static demo label
        buildQr("SUBEESHA - QUALITY POINTS\nVisit https://subeesha.com and upload this QR code to earn Quality Points.\n\nSUBEESHA ORDER DETAILS\nOrder Number: SUB-10842\nTotal Amount: Rs. 6,750");
        return;
    }
    const id = (SUB.qs("id") || "").trim().toUpperCase();
    SUB.ready.then(function(r){
        const p = r.profile;
        if (!r.user || !p || p.role !== "admin") {
            location.href = "../panel/admin/login.html?next=" + encodeURIComponent("../../page/label-print.html" + location.search);
            return;
        }
        if (!id) return fail("No order selected. Open this page from the Admin > Orders screen.");
        return Promise.all([SUB.db.collection("orders").doc(id).get(), SUB.settings("store")]).then(function(x){
            if (!x[0].exists) return fail("Order " + id + " was not found.");
            fillLabel(Object.assign({ id: x[0].id }, x[0].data()), x[1]);
        });
    }).catch(function(e){ fail(SUB.authError(e)); });
})();
