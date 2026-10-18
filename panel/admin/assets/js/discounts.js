/* Discounts / promo codes (document id = code) */
A.ready(function () {
    var body = document.getElementById("coupBody"), list = [], esc = SUB.esc;
    A.loading(body, 7);
    function draw() {
        A.rows(body, list, 7, "No coupons yet.", function (c) {
            var exp = SUB.toDate(c.expiresAt), expired = exp && exp < new Date();
            return "<tr><td><b>" + esc(c.id) + "</b><br><small style='color:#88938f'>" + esc(c.description || "") + "</small></td><td>" + (c.type === "fixed" ? A.money(c.value) : SUB.num(c.value) + "%") + "</td><td>" + (c.minOrder ? A.money(c.minOrder) : "-") + "</td><td>" + (exp ? A.date(exp) : "Never") + "</td><td>" + (c.public ? "Shown to customers" : "Private code") + "</td><td>" + A.pill(expired ? "Expired" : c.active ? "Active" : "Inactive") + "</td>" +
                '<td><button class="btn small secondary" onclick="openCouponModal(\'' + esc(c.id) + '\')"><i class="fa-solid fa-pen"></i></button> <button class="btn small danger" onclick="deleteCoupon(\'' + esc(c.id) + '\')"><i class="fa-solid fa-trash"></i></button></td></tr>';
        });
    }
    function load() { return A.load("discounts", true).then(function (l) { list = l; draw(); }).catch(A.err); }
    load();
    window.openCouponModal = function (id) {
        var c = id ? list.filter(function (x) { return x.id === id; })[0] : {}; c = c || {};
        var sel = function (v, o) { return o.map(function (x) { return '<option value="' + x[0] + '"' + (String(v) === String(x[0]) ? " selected" : "") + ">" + x[1] + "</option>"; }).join(""); };
        openModal(id ? "Edit Coupon" : "Add Coupon",
            '<div class="form-grid"><div class="field"><label>Code *</label><input id="dCode" value="' + esc(id || "") + '"' + (id ? " disabled" : "") + ' placeholder="SUMMER20" style="text-transform:uppercase"></div>' +
            '<div class="field"><label>Type</label><select id="dType">' + sel(c.type || "percent", [["percent", "Percentage (%)"], ["fixed", "Fixed amount (Rs.)"]]) + "</select></div>" +
            '<div class="field"><label>Value *</label><input id="dValue" type="number" min="1" value="' + esc(c.value || "") + '"></div>' +
            '<div class="field"><label>Minimum Order (Rs.)</label><input id="dMin" type="number" min="0" value="' + esc(c.minOrder || 0) + '"></div>' +
            '<div class="field"><label>Expires (optional)</label><input id="dExp" type="datetime-local" value="' + A.toInput(c.expiresAt) + '"></div>' +
            '<div class="field"><label>Status</label><select id="dActive">' + sel(c.active === false ? "0" : "1", [["1", "Active"], ["0", "Inactive"]]) + "</select></div>" +
            '<div class="field"><label>Visibility</label><select id="dPublic">' + sel(c.public ? "1" : "0", [["0", "Private (only people who know the code)"], ["1", "Show in customer vouchers"]]) + "</select></div>" +
            '<div class="field"><label>Description</label><input id="dDesc" value="' + esc(c.description || "") + '"></div></div>',
            A.save(function () {
                var code = (id || A.val("dCode")).toUpperCase().replace(/[^A-Z0-9_-]/g, "");
                if (!code) throw new Error("Enter a valid code (letters and numbers).");
                if (!A.num("dValue")) throw new Error("Enter the discount value.");
                if (A.val("dType") === "percent" && A.num("dValue") > 90) throw new Error("Percentage cannot exceed 90.");
                if (!id && list.some(function (x) { return x.id === code; })) throw new Error("This code already exists.");
                var data = { type: A.val("dType"), value: A.num("dValue"), minOrder: A.num("dMin"), expiresAt: A.fromInput("dExp"), active: A.val("dActive") === "1", public: A.val("dPublic") === "1", description: A.val("dDesc") };
                return SUB.db.collection("discounts").doc(code).set(data).then(function () { A.toast("Coupon saved"); return load(); });
            }), "Save");
    };
    window.deleteCoupon = function (id) { A.confirmDo("Delete coupon " + id + "?", function () { return SUB.db.collection("discounts").doc(id).delete().then(function () { A.toast("Coupon deleted"); return load(); }); }); };
});
