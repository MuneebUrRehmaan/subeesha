/* Rewards settings + loyalty card claims */
A.ready(function () {
    var esc = SUB.esc, claims = [];
    function fill(r) {
        document.getElementById("rwConv").value = r.conversion; document.getElementById("rwMin").value = r.minConvert;
        document.getElementById("rwDaily").value = 10; document.getElementById("rwReview").value = r.review;
        document.getElementById("rwFirst").value = r.firstOrder; document.getElementById("rwPer").value = r.purchasePer100;
    }
    SUB.settings("rewards", true).then(fill);
    function loadClaims() {
        var body = document.getElementById("claimBody"); A.loading(body, 4);
        return SUB.db.collection("loyaltyClaims").get().then(function (s) {
            claims = SUB.docs(s).sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); });
            A.rows(body, claims, 4, "No loyalty reward claims yet.", function (c) {
                return "<tr><td><b>" + esc(c.name || c.uid) + "</b><br><small style='color:#88938f'>" + esc(c.email || "") + "</small></td><td>" + SUB.dateTime(c.createdAt) + "</td><td>" + A.pill(c.status) + "</td><td>" +
                    (c.status === "Pending" ? '<button class="btn small primary" onclick="fulfillClaim(\'' + esc(c.id) + '\')">Mark fulfilled</button>' : "-") + "</td></tr>";
            });
        }).catch(A.err);
    }
    loadClaims();
    Promise.all([A.usersBy("customer"), SUB.db.collection("walletRequests").get()]).then(function (r) {
        var pts = r[0].reduce(function (s, u) { return s + SUB.num(u.points); }, 0);
        var conv = SUB.docs(r[1]).filter(function (x) { return x.status === "Approved"; }).reduce(function (s, x) { return s + SUB.num(x.points); }, 0);
        document.getElementById("rwStats").innerHTML = [["Points held by customers", pts.toLocaleString(), "star"], ["Points converted to wallet", conv.toLocaleString(), "repeat"], ["Customers with points", r[0].filter(function (u) { return SUB.num(u.points) > 0; }).length, "users"]]
            .map(function (x) { return '<div class="card stat"><div><span class="label">' + x[0] + '</span><div class="value">' + x[1] + '</div></div><div class="ico"><i class="fa-solid fa-' + x[2] + '"></i></div></div>'; }).join("");
    }).catch(function () { });
    window.saveRewards = function () {
        var d = { conversion: A.num("rwConv"), minConvert: A.num("rwMin"), dailyLogin: 10, review: A.num("rwReview"), firstOrder: A.num("rwFirst"), purchasePer100: A.num("rwPer") };
        if (d.conversion < 1 || d.minConvert < d.conversion) return A.toast("Check the conversion values.");
        SUB.saveSettings("rewards", d).then(function () { A.toast("Reward settings saved"); }).catch(A.err);
    };
    window.fulfillClaim = function (id) {
        SUB.db.collection("loyaltyClaims").doc(id).update({ status: "Fulfilled", fulfilledAt: SUB.now() }).then(function () { A.toast("Marked as fulfilled"); return loadClaims(); }).catch(A.err);
    };
});
