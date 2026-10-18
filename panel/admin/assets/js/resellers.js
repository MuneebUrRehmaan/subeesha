/* Resellers */
A.ready(function () {
    var body = document.getElementById("resBody"), list = [], esc = SUB.esc;
    A.loading(body, 8);
    function draw() {
        var q = document.getElementById("fSearch").value.toLowerCase().trim();
        var l = list.filter(function (r) { return !q || [r.name, r.email, r.resellerCode, r.city].join(" ").toLowerCase().indexOf(q) > -1; });
        A.rows(body, l, 8, "No resellers yet.", function (r) {
            var s = r._s || {}, blocked = SUB.isBlocked(r);
            return "<tr><td><b>" + esc(r.name) + "</b><br><small style='color:#88938f'>" + esc(r.email) + " · " + esc(r.phone || r.whatsapp || "") + "</small></td><td><code>" + esc(r.resellerCode || "-") + "</code></td><td>" + esc(r.paymentMethod || "-") + "<br><small style='color:#88938f'>" + esc(r.account || "") + "</small></td><td>" + (s.orders || 0) + "</td><td>" + A.money(s.sales) + "</td><td>" + A.money(s.earned) + "</td><td>" + A.pill(blocked ? "Blocked" : "Active") + "</td>" +
                '<td style="white-space:nowrap"><button class="btn small secondary" onclick="resetReseller(\'' + esc(r.id) + '\')" title="Send password reset email"><i class="fa-solid fa-key"></i></button> <button class="btn small ' + (blocked ? "primary" : "danger") + '" onclick="toggleReseller(\'' + esc(r.id) + '\')">' + (blocked ? "Unblock" : "Block") + "</button></td></tr>";
        });
    }
    function load() {
        return Promise.all([A.usersBy("reseller"), SUB.db.collection("orders").get()]).then(function (r) {
            var st = A.resellerStats(SUB.docs(r[1]));
            list = r[0].map(function (x) { x._s = st[x.id]; return x; }).sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); }); draw();
        }).catch(A.err);
    }
    document.getElementById("fSearch").oninput = A.debounce(draw, 150);
    load();
    window.toggleReseller = function (id) {
        var r = list.filter(function (x) { return x.id === id; })[0], b = SUB.isBlocked(r);
        A.confirmDo((b ? "Unblock " : "Block ") + r.name + "?", function () { return SUB.db.collection("users").doc(id).update({ status: b ? "active" : "blocked", access: b ? "Allowed" : "Suspended" }).then(function () { A.toast("Updated"); return load(); }); });
    };
    window.resetReseller = function (id) {
        var r = list.filter(function (x) { return x.id === id; })[0];
        SUB.resetPassword(r.email).then(function () { A.toast("Password reset email sent to " + r.email); }).catch(A.err);
    };
    window.openResellerModal = function () {
        openModal("Add Reseller",
            '<div class="form-grid"><div class="field"><label>Full Name *</label><input id="rName"></div><div class="field"><label>Email *</label><input id="rEmail" type="email"></div>' +
            '<div class="field"><label>Phone *</label><input id="rPhone"></div><div class="field"><label>City</label><input id="rCity"></div>' +
            '<div class="field"><label>Payment Method</label><select id="rPay"><option>Easypaisa</option><option>JazzCash</option><option>Bank Account</option></select></div><div class="field"><label>Account Number</label><input id="rAcc"></div></div>' +
            '<p class="label" style="margin-top:8px">A login is created with a one-time temporary password that you will see after saving.</p>',
            A.save(function () {
                var o = { name: A.val("rName"), email: A.val("rEmail").toLowerCase(), phone: A.val("rPhone"), city: A.val("rCity"), paymentMethod: A.val("rPay"), account: A.val("rAcc") };
                if (!o.name || !o.email || !o.phone) throw new Error("Name, email and phone are required.");
                return A.createReseller(o).then(function (r) { setTimeout(function () { A.showCredentials("Reseller Created", o.email, r.password, r.code); }, 200); load(); return true; })
                    .catch(function (e) { throw new Error(e.code === "auth/email-already-in-use" ? "This email already has an account." : SUB.authError(e)); });
            }), "Create Reseller");
    };
});
