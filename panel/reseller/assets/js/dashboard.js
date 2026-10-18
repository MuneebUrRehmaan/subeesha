/* Reseller dashboard - live stats */
R.ready(function () {
    var $ = function (s) { return document.querySelector(s); };
    if (!SUB.configured) return;
    SUB.db.collection("orders").where("resellerId", "==", R.me.id).get().then(function (s) {
        var orders = SUB.docs(s);
        var ok = orders.filter(function (o) { return !/^(Cancelled|Returned)$/.test(o.status); });
        var sales = ok.reduce(function (t, o) { return t + SUB.num(o.total) + SUB.num(o.walletUsed); }, 0);
        var earned = ok.filter(function (o) { return o.status === "Delivered" && !o.commissionVoid; }).reduce(function (t, o) { return t + SUB.num(o.commission); }, 0);
        var pending = ok.filter(function (o) { return o.status !== "Delivered"; }).reduce(function (t, o) { return t + SUB.num(o.commission); }, 0);
        var pendCount = ok.filter(function (o) { return o.status !== "Delivered"; }).length;
        var cards = document.querySelectorAll(".stats-grid .stat-card h2");
        if (cards[0]) cards[0].textContent = SUB.money(sales);
        if (cards[1]) cards[1].textContent = SUB.money(earned);
        if (cards[2]) cards[2].textContent = SUB.money(pending);
        if (cards[3]) cards[3].textContent = SUB.money(R.me.wallet);
        var pendText = document.querySelector(".pending-text"); if (pendText) pendText.textContent = pendCount + " order(s) pending";
        var growth = document.querySelectorAll(".growth"); var now = new Date(), cm = now.getMonth();
        function pct(list) {
            var cur = list.filter(function (o) { var t = SUB.toDate(o.createdAt); return t && t.getMonth() === cm; }).reduce(function (s, o) { return s + SUB.num(o.total) + SUB.num(o.walletUsed); }, 0);
            var prev = list.filter(function (o) { var t = SUB.toDate(o.createdAt); return t && t.getMonth() === (cm - 1 + 12) % 12; }).reduce(function (s, o) { return s + SUB.num(o.total) + SUB.num(o.walletUsed); }, 0);
            if (!prev) return cur ? "New this month" : "No sales yet";
            var p = Math.round((cur - prev) / prev * 100); return (p >= 0 ? "+" : "") + p + "% this month";
        }
        if (growth[0]) growth[0].textContent = pct(ok);
        if (growth[1]) growth[1].textContent = pct(ok.filter(function (o) { return o.status === "Delivered"; }));

        var days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], vals = [0, 0, 0, 0, 0, 0, 0];
        var weekAgo = Date.now() - 7 * 864e5;
        ok.forEach(function (o) { var t = SUB.ms(o.createdAt); if (t < weekAgo) return; var idx = (new Date(t).getDay() + 6) % 7; vals[idx] += SUB.num(o.total) + SUB.num(o.walletUsed); });
        var max = Math.max.apply(null, vals.concat([1]));
        var bars = document.querySelectorAll(".bar-item .bar");
        bars.forEach(function (b, i) { b.style.height = Math.max(4, Math.round(vals[i] / max * 100)) + "%"; b.title = SUB.money(vals[i]); });
    }).catch(R.err);
});
