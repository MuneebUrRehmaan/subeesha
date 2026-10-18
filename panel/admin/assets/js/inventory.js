/* Inventory */
A.ready(function () {
    var body = document.getElementById("invBody"), all = [], low = 10, esc = SUB.esc;
    A.loading(body, 7);
    function st(p) { return p.stock == null ? "n/a" : p.stock <= 0 ? "Out of stock" : p.stock <= low ? "Low stock" : "In stock"; }
    function draw() {
        var q = document.getElementById("fSearch").value.toLowerCase().trim(), f = document.getElementById("fStock").value;
        var l = all.filter(function (p) {
            if (q && [p.name, p.sku, p.category].join(" ").toLowerCase().indexOf(q) < 0) return false;
            if (f === "low") return st(p) === "Low stock"; if (f === "out") return st(p) === "Out of stock"; return true;
        });
        var value = all.reduce(function (s, p) { return s + SUB.num(p.stock) * SUB.num(p.price); }, 0);
        document.getElementById("invStats").innerHTML =
            [["Products", all.length, "box"], ["Low stock", all.filter(function (p) { return st(p) === "Low stock"; }).length, "triangle-exclamation"], ["Out of stock", all.filter(function (p) { return st(p) === "Out of stock"; }).length, "ban"], ["Stock value", A.money(value), "coins"]]
                .map(function (x) { return '<div class="card stat"><div><span class="label">' + x[0] + '</span><div class="value">' + x[1] + '</div></div><div class="ico"><i class="fa-solid fa-' + x[2] + '"></i></div></div>'; }).join("");
        A.rows(body, l, 7, "No products.", function (p) {
            var s = st(p), t = s === "In stock" ? "success" : s === "Low stock" ? "pending" : s === "n/a" ? "info" : "danger";
            return "<tr><td><b>" + esc(p.name) + "</b></td><td>" + esc(p.sku || "-") + "</td><td>" + esc(p.category || "-") + "</td><td><b>" + (p.stock == null ? "-" : p.stock) + "</b></td><td>" + SUB.num(p.sold) + "</td><td>" + A.pill(s, t) + "</td>" +
                '<td style="white-space:nowrap"><input id="inv_' + esc(p.id) + '" type="number" min="0" value="' + esc(p.stock == null ? 0 : p.stock) + '" style="width:80px;padding:6px"> <button class="btn small primary" onclick="setStock(\'' + esc(p.id) + '\')">Set</button></td></tr>';
        });
    }
    function load() {
        return Promise.all([A.load("products", true), SUB.settings("store")]).then(function (r) {
            low = SUB.num(r[1].lowStock); all = r[0].sort(function (a, b) { return SUB.num(a.stock) - SUB.num(b.stock); }); draw();
        }).catch(A.err);
    }
    document.getElementById("fSearch").oninput = A.debounce(draw, 150);
    document.getElementById("fStock").onchange = draw;
    load();
    window.setStock = function (id) {
        var v = Math.floor(SUB.num(document.getElementById("inv_" + id).value));
        if (v < 0) return A.toast("Stock cannot be negative.");
        SUB.db.collection("products").doc(id).update({ stock: v, updatedAt: SUB.now() }).then(function () { A.toast("Stock updated"); A.refreshBadges(); return load(); }).catch(A.err);
    };
});
