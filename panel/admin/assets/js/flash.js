/* Flash sale settings + product selection */
A.ready(function () {
    var body = document.getElementById("flBody"), products = [], esc = SUB.esc;
    A.loading(body, 5);
    Promise.all([SUB.settings("flash", true), A.load("products", true)]).then(function (r) {
        var f = r[0]; products = r[1].filter(function (p) { return p.active !== false; });
        document.getElementById("flName").value = f.name || "Flash Sale";
        document.getElementById("flPct").value = f.discountPercent || 20;
        document.getElementById("flEnd").value = A.toInput(f.endsAt);
        document.getElementById("flActive").value = f.active ? "1" : "0";
        A.rows(body, products, 5, "Add products first.", function (p) {
            return '<tr><td><input type="checkbox" id="fc_' + esc(p.id) + '"' + (p.inFlash ? " checked" : "") + '></td><td><b>' + esc(p.name) + "</b></td><td>" + A.money(p.price) + '</td><td><input id="fp_' + esc(p.id) + '" type="number" min="0" value="' + esc(p.flashPrice || "") + '" placeholder="auto" style="width:110px;padding:6px"></td><td>' + (p.stock == null ? "-" : p.stock) + "</td></tr>";
        });
    }).catch(A.err);
    window.saveFlash = function () {
        var end = A.fromInput("flEnd"), active = A.val("flActive") === "1", pct = A.num("flPct");
        if (active && (!end || end.toMillis() < Date.now())) return A.toast("Set a future end date/time to activate the sale.");
        if (pct < 1 || pct > 90) return A.toast("Discount must be between 1 and 90%.");
        var batch = SUB.db.batch(), n = 0;
        products.forEach(function (p) {
            var on = document.getElementById("fc_" + p.id).checked, fp = SUB.num(document.getElementById("fp_" + p.id).value);
            if (fp && fp >= SUB.num(p.price)) { n = -1; }
            if (!!p.inFlash !== on || SUB.num(p.flashPrice) !== fp) batch.update(SUB.db.collection("products").doc(p.id), { inFlash: on, flashPrice: on ? fp : 0 });
        });
        if (n === -1) return A.toast("A fixed sale price must be lower than the regular price.");
        batch.set(SUB.db.collection("settings").doc("flash"), { name: A.val("flName") || "Flash Sale", discountPercent: pct, endsAt: end, active: active, updatedAt: SUB.now() }, { merge: true });
        batch.commit().then(function () { A.drop("products"); A.toast("Flash sale saved"); }).catch(A.err);
    };
});
