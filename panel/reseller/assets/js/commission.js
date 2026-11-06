/* Reseller - commission summary */
R.ready(function () {
    var cards = document.querySelectorAll(".commission-summary h2"); if (!cards.length || !SUB.configured) return;
    var resellerUid = R.uid || (SUB.user && SUB.user.uid);
    if (!resellerUid) { R.err(new Error("Your reseller session could not be verified. Please sign in again.")); return; }

    SUB.db.collection("orders").where("resellerId", "==", resellerUid).onSnapshot(function (s) {
        var ok = SUB.docs(s).filter(function (o) { return !/^(Cancelled|Returned)$/.test(o.status); });
        var earned = ok.filter(function (o) { return o.status === "Delivered" && !o.commissionVoid; }).reduce(function (t, o) { return t + SUB.num(o.commission); }, 0);
        var pending = ok.filter(function (o) { return o.status !== "Delivered"; }).reduce(function (t, o) { return t + SUB.num(o.commission); }, 0);
        cards[0].textContent = SUB.money(earned);
        cards[1].textContent = SUB.money(R.me.wallet);
        cards[2].textContent = SUB.money(pending);
    }, R.err);
});
