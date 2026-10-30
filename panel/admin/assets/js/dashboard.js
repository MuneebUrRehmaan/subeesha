/* Dashboard - live stats from Firestore */
A.ready(function () {
    var db = SUB.db, $ = function (id) { return document.getElementById(id); };
    var orders = [];
    ["stSales", "stOrders", "stCustomers", "activeResellerCount"].forEach(function (id) { $(id).innerHTML = '<span class="sk" style="display:inline-block;width:90px;height:24px"></span>'; });
    ["stSalesCh", "stOrdersCh", "stCustomersCh"].forEach(function (id) { $(id).innerHTML = '<span class="sk" style="display:inline-block;width:110px;height:10px"></span>'; });
    $("chart").innerHTML = '<div class="sk" style="width:100%;height:100%"></div>';
    $("alerts").innerHTML = '<div class="sk" style="height:62px;margin-bottom:10px"></div><div class="sk" style="height:62px;margin-bottom:10px"></div><div class="sk" style="height:62px"></div>';
    A.loading($("recentOrders"), 5, 5);

    function monthKey(d) { return d.getFullYear() + "-" + d.getMonth(); }
    function valid(o) { return !/^(Cancelled|Returned)$/.test(o.status); }
    function pct(cur, prev) { if (!prev) return cur ? "New this month" : "No change"; var p = Math.round((cur - prev) / prev * 100); return (p >= 0 ? "\u2191 " : "\u2193 ") + Math.abs(p) + "% vs last month"; }

    function drawChart() {
        var mode = $("chartRange").value, buckets = [], now = new Date();
        if (mode === "7m") {
            for (var i = 6; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth() - i, 1); buckets.push({ k: monthKey(d), l: d.toLocaleString("en", { month: "short" }), v: 0 }); }
        } else {
            for (var j = 29; j >= 0; j -= 3) { var dd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - j); buckets.push({ from: dd, l: dd.getDate() + "/" + (dd.getMonth() + 1), v: 0 }); }
        }
        orders.filter(valid).forEach(function (o) {
            var t = SUB.toDate(o.createdAt); if (!t) return;
            if (mode === "7m") { var b = buckets.filter(function (x) { return x.k === monthKey(t); })[0]; if (b) b.v += SUB.num(o.total) + SUB.num(o.walletUsed); }
            else { for (var n = buckets.length - 1; n >= 0; n--) { if (t >= buckets[n].from) { buckets[n].v += SUB.num(o.total) + SUB.num(o.walletUsed); break; } } }
        });
        var max = Math.max.apply(null, buckets.map(function (b) { return b.v; }).concat([1]));
        $("chart").innerHTML = buckets.map(function (b) { return '<div class="bar" title="' + A.money(b.v) + '"><i style="height:' + Math.max(3, Math.round(b.v / max * 100)) + '%"></i></div>'; }).join("");
        $("axis").innerHTML = buckets.map(function (b) { return "<span>" + b.l + "</span>"; }).join("");
    }
    $("chartRange").onchange = drawChart;

    Promise.all([
        db.collection("orders").get(),
        db.collection("users").where("role", "==", "customer").get(),
        db.collection("users").where("role", "==", "reseller").get(),
        db.collection("products").get(),
        A.isMgr() ? db.collection("resellerApplications").where("status", "==", "Pending").get() : Promise.resolve(null),
        A.isMgr() ? db.collection("walletRequests").where("status", "==", "Pending").get() : Promise.resolve(null),
        SUB.settings("store")
    ].map(function (p) { return Promise.resolve(p).catch(function () { return null; }); })).then(function (r) {
        orders = r[0] ? SUB.docs(r[0]) : [];
        var customers = r[1] ? SUB.docs(r[1]) : [], resellers = r[2] ? SUB.docs(r[2]) : [], products = r[3] ? SUB.docs(r[3]) : [];
        var now = new Date(), cm = monthKey(now), pm = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        var sales = 0, sCur = 0, sPrev = 0, oCur = 0, oPrev = 0, cCur = 0, cPrev = 0;
        orders.filter(valid).forEach(function (o) {
            var t = SUB.toDate(o.createdAt), v = SUB.num(o.total) + SUB.num(o.walletUsed); sales += v;
            if (!t) return; if (monthKey(t) === cm) { sCur += v; oCur++; } else if (monthKey(t) === pm) { sPrev += v; oPrev++; }
        });
        customers.forEach(function (c) { var t = SUB.toDate(c.createdAt); if (!t) return; if (monthKey(t) === cm) cCur++; else if (monthKey(t) === pm) cPrev++; });
        $("stSales").textContent = A.money(sales); $("stSalesCh").textContent = pct(sCur, sPrev);
        $("stOrders").textContent = orders.length; $("stOrdersCh").textContent = pct(oCur, oPrev);
        $("stCustomers").textContent = customers.length; $("stCustomersCh").textContent = pct(cCur, cPrev);
        $("activeResellerCount").textContent = resellers.filter(function (x) { return x.status === "active"; }).length;

        var st = r[6] || SUB.defaults.store, low = products.filter(function (p) { return p.active !== false && p.stock != null && p.stock <= SUB.num(st.lowStock); }).length;
        var pend = orders.filter(function (o) { return o.status === "Pending"; }).length;
        function al(bg, icon, t, txt, href) { return '<a href="' + href + '" style="display:block;padding:12px;background:' + bg + ';border-radius:4px;margin-bottom:10px;font-size:12px;color:inherit;text-decoration:none"><b><i class="fa-solid fa-' + icon + '"></i> ' + t + '</b><br><br><span style="color:#777">' + txt + "</span></a>"; }
        $("alerts").innerHTML =
            al("#fff6e4", "triangle-exclamation", "Low Stock", low + " product(s) are running low.", "inventory.html") +
            al("#eaf5ef", "cart-shopping", "Pending Orders", pend + " order(s) waiting to be processed.", "orders.html") +
            (r[4] ? al("#eaf5ef", "handshake", "Reseller Requests", r[4].size + " application(s) waiting for approval.", "reseller-requests.html") : "") +
            (r[5] ? al("#edf2fa", "repeat", "Wallet Requests", r[5].size + " points conversion request(s) pending.", "conversion-requests.html") : "");

        drawChart();
        var recent = orders.sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); }).slice(0, 6);
        A.rows($("recentOrders"), recent, 5, "No orders yet.", function (o) {
            return "<tr><td>#" + esc(o.orderNo || o.id) + "</td><td>" + esc((o.customer || {}).name || "-") + "</td><td>" + A.date(o.createdAt) + "</td><td>" + A.money(o.total) + "</td><td>" + A.pill(o.status) + "</td></tr>";
        });
        if (!products.length && A.isMgr()) {
            $("seedBox").innerHTML = '<div class="a-note ok"><b>Your store is empty.</b> Import the sample categories, products, banners and coupons from the original design to get started. ' +
                '<button class="btn small primary" onclick="A.importDemo()" style="margin-left:8px">Import Demo Data</button></div>';
        }
    });
    var esc = SUB.esc;
});
