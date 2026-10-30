/* Orders - list, filter, status workflow, manual orders, labels */
A.ready(function () {
    var body = document.getElementById("orderBody"), all = [], products = [];
    var esc = SUB.esc;
    A.loading(body, 7);

    function nextOptions(o) {
        var role = A.role(), s = o.status;
        var opts = { Pending: ["Processing", "Cancelled"], Processing: ["Shipped", "Delivered", "Cancelled"], Shipped: ["Delivered", "Cancelled"], Delivered: ["Returned"], Cancelled: [], Returned: [] }[s] || [];
        if (role === "Delivery Manager") opts = opts.filter(function (x) { return x === "Shipped"; });
        return opts;
    }
    function render() {
        var st = document.getElementById("fStatus").value, q = document.getElementById("fSearch").value.toLowerCase().trim();
        var list = all.filter(function (o) {
            if (st && o.status !== st) return false;
            if (!q) return true;
            var c = o.customer || {};
            return [o.orderNo, c.name, c.phone, c.email, c.city].join(" ").toLowerCase().indexOf(q) > -1;
        });
        A.rows(body, list, 7, "No orders found.", function (o) {
            var c = o.customer || {}, opts = nextOptions(o);
            var sel = opts.length ? '<select onchange="changeStatus(\'' + esc(o.id) + '\',this)" style="margin-left:6px;padding:4px;font-size:11px"><option value="">Change...</option>' + opts.map(function (x) { return "<option>" + x + "</option>"; }).join("") + "</select>" : "";
            return "<tr><td><b>#" + esc(o.orderNo || o.id) + "</b>" + (o.resellerId ? ' <small style="color:#0e3d34">(reseller)</small>' : "") + "</td><td>" + esc(c.name || "-") + "<br><small style='color:#88938f'>" + esc(c.phone || "") + "</small></td><td>" + A.date(o.createdAt) + "</td><td>" + A.money(o.total) + "</td><td>" + esc(o.paymentMethod || "-") + "</td><td>" + A.pill(o.status) + sel + "</td>" +
                '<td><button class="btn small secondary" onclick="viewOrder(\'' + esc(o.id) + '\')"><i class="fa-solid fa-eye"></i></button> <a class="btn small secondary" target="_blank" href="../../page/label-print.html?id=' + encodeURIComponent(o.id) + '" title="Print label"><i class="fa-solid fa-print"></i></a></td></tr>';
        });
    }
    function load() {
        return SUB.db.collection("orders").get().then(function (s) {
            all = SUB.docs(s).sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); }); render();
        }).catch(function (e) { A.err(e); body.innerHTML = '<tr><td colspan="7" class="a-empty">Could not load orders.</td></tr>'; });
    }
    document.getElementById("fStatus").onchange = render;
    document.getElementById("fSearch").oninput = A.debounce(render, 150);
    load();

    window.changeStatus = function (id, sel) {
        var v = sel.value; if (!v) return;
        if (!confirm("Change order status to " + v + "?")) { sel.value = ""; return; }
        A.setOrderStatus(id, v).then(function () { var oo = all.filter(function (x) { return x.id === id; })[0]; if (oo) SUB.mail.statusChanged(oo, v); A.toast("Order updated to " + v); A.refreshBadges(); return load(); }).catch(function (e) { sel.value = ""; A.err(e); });
    };

    window.viewOrder = function (id) {
        var o = all.filter(function (x) { return x.id === id; })[0]; if (!o) return;
        var c = o.customer || {};
        var items = (o.items || []).map(function (i) { return "<tr><td>" + esc(i.name) + (i.color ? " · " + esc(i.color) : "") + (i.size ? " · " + esc(i.size) : "") + "</td><td>" + i.qty + "</td><td>" + A.money(i.price * i.qty) + "</td></tr>"; }).join("");
        var hist = (o.statusHistory || []).map(function (h) { return esc(h.status) + " (" + new Date(h.at).toLocaleString() + ")"; }).join(" → ");
        openModal("Order #" + (o.orderNo || o.id),
            '<div class="a-kv"><b>Customer</b><span>' + esc(c.name || "") + "</span><b>Phone</b><span>" + esc(c.phone || "") + "</span><b>Email</b><span>" + esc(c.email || "-") + "</span>" +
            "<b>Address</b><span>" + esc([c.address, c.area, c.city, c.province].filter(Boolean).join(", ")) + "</span><b>Payment</b><span>" + esc(o.paymentMethod || "") + (o.paymentRef ? " · ref: " + esc(o.paymentRef) : "") + "</span>" +
            "<b>Status</b><span>" + A.pill(o.status) + "</span><b>Placed</b><span>" + SUB.dateTime(o.createdAt) + "</span>" + (o.resellerId ? "<b>Commission</b><span>" + A.money(o.commission) + (o.commissionVoid ? " (void)" : "") + "</span>" : "") + "</div>" +
            '<div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>' + items + "</tbody></table></div>" +
            '<div class="a-kv" style="margin-top:10px"><b>Subtotal</b><span>' + A.money(o.subtotal) + "</span><b>Shipping</b><span>" + A.money(o.shipping) + "</span><b>Discount</b><span>- " + A.money(o.discount) + (o.couponCode ? " (" + esc(o.couponCode) + ")" : "") + "</span><b>Wallet</b><span>- " + A.money(o.walletUsed) + "</span><b>Total</b><span><b style='color:#0e3d34'>" + A.money(o.total) + "</b></span></div>" +
            (hist ? '<p class="label" style="margin-top:8px">' + hist + "</p>" : ""), function () { closeModal(); }, "Close");
    };

    window.exportOrders = function () {
        var rows = [["Order", "Date", "Customer", "Phone", "City", "Items", "Subtotal", "Shipping", "Discount", "Wallet", "Total", "Payment", "Status"]];
        all.forEach(function (o) { var c = o.customer || {}; rows.push([o.orderNo, SUB.date(o.createdAt), c.name, c.phone, c.city, (o.items || []).map(function (i) { return i.name + " x" + i.qty; }).join("; "), o.subtotal, o.shipping, o.discount, o.walletUsed, o.total, o.paymentMethod, o.status]); });
        A.csv("orders.csv", rows);
    };

    /* ----- manual order ----- */
    window.openOrderModal = function () {
        SUB.catalog(true).then(function (cat) {
            products = cat.products;
            var opts = '<option value="">- select product -</option>' + products.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + " (" + A.money(p._price) + ", stock " + p._stock + ")</option>"; }).join("");
            var line = function (n) { return '<div style="display:grid;grid-template-columns:1fr 70px;gap:8px;margin-bottom:6px"><select id="moP' + n + '">' + opts + '</select><input id="moQ' + n + '" type="number" min="1" value="1"></div>'; };
            openModal("Add Manual Order",
                '<div class="form-grid"><div class="field"><label>Customer Name *</label><input id="moName"></div><div class="field"><label>Phone *</label><input id="moPhone"></div>' +
                '<div class="field"><label>City *</label><input id="moCity"></div><div class="field"><label>Payment</label><select id="moPay"><option>Cash on Delivery</option><option>Easypaisa</option><option>JazzCash</option><option>Bank Transfer</option></select></div>' +
                '<div class="field full"><label>Address *</label><input id="moAddr"></div><div class="field full"><label>Products (up to 4 lines)</label>' + line(0) + line(1) + line(2) + line(3) + "</div></div>",
                A.save(function () {
                    var lines = [0, 1, 2, 3].map(function (n) { return { id: A.val("moP" + n), qty: Math.max(1, Math.floor(A.num("moQ" + n))) }; }).filter(function (l) { return l.id; });
                    if (!A.val("moName") || !A.val("moPhone") || !A.val("moCity") || !A.val("moAddr")) throw new Error("Please fill all required fields.");
                    if (!lines.length) throw new Error("Select at least one product.");
                    return SUB.placeOrder({ items: lines, customer: { name: A.val("moName"), phone: A.val("moPhone"), email: "", city: A.val("moCity"), province: "", area: "", postal: "", address: A.val("moAddr") }, paymentMethod: A.val("moPay"), source: "admin" })
                        .then(function (o) { A.toast("Order #" + o.orderNo + " created"); return load(); });
                }), "Create Order");
        });
    };
});
