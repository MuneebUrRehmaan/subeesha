A.ready(function () {
    var esc = SUB.esc, orders = [];
    function render() {
        var days = Number(document.getElementById("rgRange").value), from = days ? Date.now() - days * 864e5 : 0;
        var l = orders.filter(function (o) { return SUB.ms(o.createdAt) >= from; });
        var ok = l.filter(function (o) { return !/^(Cancelled|Returned)$/.test(o.status); });
        var rev = ok.reduce(function (s, o) { return s + SUB.num(o.total) + SUB.num(o.walletUsed); }, 0);
        var comm = ok.reduce(function (s, o) { return s + (o.resellerId ? SUB.num(o.commission) : 0); }, 0);
        document.getElementById("rpStats").innerHTML = [["Revenue", A.money(rev), "money-bill-wave"], ["Orders", ok.length, "cart-shopping"], ["Avg. order value", A.money(ok.length ? rev / ok.length : 0), "chart-line"], ["Cancelled / returned", l.length - ok.length, "ban"], ["Reseller commission", A.money(comm), "handshake"]]
            .map(function (x) { return '<div class="card stat"><div><span class="label">' + x[0] + '</span><div class="value">' + x[1] + '</div></div><div class="ico"><i class="fa-solid fa-' + x[2] + '"></i></div></div>'; }).join("");
        var prod = {}; ok.forEach(function (o) { (o.items || []).forEach(function (i) { var p = prod[i.name] || (prod[i.name] = { q: 0, v: 0 }); p.q += i.qty; p.v += i.qty * SUB.num(i.price); }); });
        var top = Object.keys(prod).map(function (k) { return { n: k, q: prod[k].q, v: prod[k].v }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 10);
        A.rows(document.getElementById("topBody"), top, 3, "No sales in this period.", function (p) { return "<tr><td>" + esc(p.n) + "</td><td>" + p.q + "</td><td>" + A.money(p.v) + "</td></tr>"; });
        function group(key) { var g = {}; l.forEach(function (o) { var k = o[key] || "-", x = g[k] || (g[k] = { n: 0, v: 0 }); x.n++; x.v += SUB.num(o.total) + SUB.num(o.walletUsed); }); return Object.keys(g).map(function (k) { return "<tr><td>" + esc(k) + "</td><td>" + g[k].n + "</td><td>" + A.money(g[k].v) + "</td></tr>"; }).join("") || '<tr><td colspan="3" class="a-empty">No data.</td></tr>'; }
        document.getElementById("stBody").innerHTML = group("status"); document.getElementById("pmBody").innerHTML = group("paymentMethod");
    }
    SUB.db.collection("orders").get().then(function (s) { orders = SUB.docs(s); render(); }).catch(A.err);
    document.getElementById("rgRange").onchange = render;
    window.exportReport = function () {
        var days = Number(document.getElementById("rgRange").value), from = days ? Date.now() - days * 864e5 : 0;
        var rows = [["Order", "Date", "Customer", "City", "Status", "Payment", "Subtotal", "Shipping", "Discount", "Total", "Commission"]];
        orders.filter(function (o) { return SUB.ms(o.createdAt) >= from; }).forEach(function (o) { var c = o.customer || {}; rows.push([o.orderNo, SUB.date(o.createdAt), c.name, c.city, o.status, o.paymentMethod, o.subtotal, o.shipping, o.discount, o.total, o.commission || 0]); });
        A.csv("sales-report.csv", rows);
    };
});
