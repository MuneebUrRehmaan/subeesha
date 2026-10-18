/* Points -> wallet conversion requests */
A.ready(function () {
    var body = document.getElementById("reqBody"), list = [], esc = SUB.esc;
    A.loading(body, 6);
    function draw() {
        var f = document.getElementById("fStatus").value, l = list.filter(function (r) { return !f || r.status === f; });
        A.rows(body, l, 6, "No requests.", function (r) {
            return "<tr><td><b>" + esc(r.name || r.uid) + "</b><br><small style='color:#88938f'>" + esc(r.email || "") + "</small></td><td>" + SUB.num(r.points).toLocaleString() + "</td><td>" + A.money(r.amount) + "</td><td>" + SUB.dateTime(r.createdAt) + "</td><td>" + A.pill(r.status) + "</td><td>" +
                (r.status === "Pending" ? '<button class="btn small primary" onclick="decide(\'' + esc(r.id) + '\',true)">Approve</button> <button class="btn small danger" onclick="decide(\'' + esc(r.id) + '\',false)">Reject</button>' : "-") + "</td></tr>";
        });
    }
    function load() { return A.load("walletRequests", true).then(function (l) { list = l.sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); }); draw(); }).catch(A.err); }
    document.getElementById("fStatus").onchange = draw;
    load();
    window.decide = function (id, ok) {
        if (!confirm(ok ? "Approve this conversion? Points are deducted and wallet credited." : "Reject this request?")) return;
        var db = SUB.db, FV = SUB.FV, rref = db.collection("walletRequests").doc(id);
        db.runTransaction(function (tx) {
            return tx.get(rref).then(function (rs) {
                var r = rs.data(); if (r.status !== "Pending") throw new Error("This request was already processed.");
                if (!ok) { tx.update(rref, { status: "Rejected", processedAt: SUB.now(), processedBy: A.me.name }); return; }
                var uref = db.collection("users").doc(r.uid);
                return tx.get(uref).then(function (us) {
                    var u = us.data();
                    if (!us.exists || SUB.num(u.points) < r.points) throw new Error("Customer no longer has enough points.");
                    tx.update(uref, { points: FV.increment(-r.points), wallet: FV.increment(SUB.num(r.amount)) });
                    tx.set(db.collection("walletTransactions").doc(), { uid: r.uid, title: "Wallet Conversion", amount: SUB.num(r.amount), createdAt: SUB.now() });
                    tx.update(rref, { status: "Approved", processedAt: SUB.now(), processedBy: A.me.name });
                });
            });
        }).then(function () { A.toast(ok ? "Request approved" : "Request rejected"); A.refreshBadges(); return load(); }).catch(A.err);
    };
});
