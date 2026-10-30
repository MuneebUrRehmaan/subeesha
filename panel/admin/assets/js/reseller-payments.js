/* Reseller withdrawal requests */
A.ready(function () {
    var body = document.getElementById("payBody"), list = [], esc = SUB.esc;
    A.loading(body, 7);
    function draw() {
        var f = document.getElementById("fStatus").value, l = list.filter(function (p) { return !f || p.status === f; });
        var sum = function (s) { return list.filter(function (p) { return p.status === s; }).reduce(function (t, p) { return t + SUB.num(p.amount); }, 0); };
        document.getElementById("payStats").innerHTML = [["Pending payouts", A.money(sum("Pending")), "hourglass-half"], ["Paid to date", A.money(sum("Paid")), "circle-check"], ["Requests", list.length, "list"]]
            .map(function (x) { return '<div class="card stat"><div><span class="label">' + x[0] + '</span><div class="value">' + x[1] + '</div></div><div class="ico"><i class="fa-solid fa-' + x[2] + '"></i></div></div>'; }).join("");
        A.rows(body, l, 7, "No withdrawal requests.", function (p) {
            return "<tr><td><b>" + esc(p.name || p.uid) + "</b></td><td>" + A.money(p.amount) + "</td><td>" + esc(p.method || "-") + "</td><td>" + esc(p.account || "-") + "</td><td>" + SUB.dateTime(p.createdAt) + "</td><td>" + A.pill(p.status) + (p.ref ? "<br><small style='color:#88938f'>ref " + esc(p.ref) + "</small>" : "") + "</td><td>" +
                (p.status === "Pending" ? '<button class="btn small primary" onclick="payOut(\'' + esc(p.id) + '\')">Mark Paid</button> <button class="btn small danger" onclick="rejectPay(\'' + esc(p.id) + '\')">Reject</button>' : "-") + "</td></tr>";
        });
    }
    function load() { return A.load("payouts", true).then(function (l) { list = l.sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); }); draw(); }).catch(A.err); }
    document.getElementById("fStatus").onchange = draw;
    load();
    window.payOut = function (id) {
        openModal("Mark as Paid", '<div class="field full"><label>Transaction reference (optional)</label><input id="pRef" placeholder="e.g. Easypaisa TID"></div><p class="label" style="margin-top:8px">The amount is deducted from the reseller\'s wallet balance.</p>', A.save(function () {
            var db = SUB.db, FV = SUB.FV, ref = db.collection("payouts").doc(id), tid = A.val("pRef");
            return db.runTransaction(function (tx) {
                return tx.get(ref).then(function (ps) {
                    var p = ps.data(); if (!p || p.status !== "Pending") throw new Error("This request was already processed.");
                    var uref = db.collection("users").doc(p.uid);
                    return tx.get(uref).then(function (us) {
                        var bal = SUB.num((us.data() || {}).wallet), amt = SUB.num(p.amount);
                        if (bal < amt) throw new Error("Reseller balance (" + A.money(bal) + ") is lower than the requested amount.");
                        tx.update(uref, { wallet: FV.increment(-amt) });
                        tx.set(db.collection("walletTransactions").doc(), { uid: p.uid, title: "Withdrawal paid", amount: -amt, createdAt: SUB.now() });
                        tx.update(ref, { status: "Paid", ref: tid, processedAt: SUB.now(), processedBy: A.me.name });
                    });
                });
            }).then(function () { A.toast("Marked as paid and balance deducted"); return load(); });
        }), "Confirm Paid");
    };
    window.rejectPay = function (id) {
        A.confirmDo("Reject this withdrawal request? The amount returns to the reseller's balance.", function () {
            return SUB.db.collection("payouts").doc(id).update({ status: "Rejected", processedAt: SUB.now(), processedBy: A.me.name }).then(function () { A.toast("Request rejected"); return load(); });
        });
    };
});
