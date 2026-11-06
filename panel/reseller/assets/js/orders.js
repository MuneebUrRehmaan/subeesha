/* Reseller - my sales */
R.ready(function () {
    var body = document.getElementById("salesTable"); if (!body || !SUB.configured) return;
    var esc = SUB.esc;
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#88938f">Loading...</td></tr>';
    var resellerUid = R.uid || (SUB.user && SUB.user.uid);
    if (!resellerUid) {
        body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px">Your reseller session could not be verified. Please sign in again.</td></tr>';
        return;
    }

    SUB.db.collection("orders").where("resellerId", "==", resellerUid).onSnapshot(function (s) {
        var orders = SUB.docs(s).sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); });
        if (!orders.length) {
            body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#88938f">No sales yet. Share a product referral link or create your first order from the Products page.</td></tr>';
            return;
        }
        var map = { Delivered: "completed", Pending: "pending", Processing: "pending", Shipped: "pending", Cancelled: "cancelled", Returned: "cancelled" };
        body.innerHTML = orders.map(function (o) {
            var items = (o.items || []).map(function (i) { return esc(i.name) + " x" + esc(i.qty); }).join(", ");
            return "<tr><td>#" + esc(o.orderNo) + "</td><td>" + esc((o.customer || {}).name || "-") + "</td><td>" + esc(items) + "</td><td>" + SUB.money(SUB.num(o.total) + SUB.num(o.walletUsed)) + '</td><td class="commission">' + (o.commissionVoid ? "Voided" : "+" + SUB.money(o.commission)) + '</td><td><span class="status ' + (map[o.status] || "pending") + '">' + esc(o.status) + "</span></td></tr>";
        }).join("");
    }, R.err);
});
