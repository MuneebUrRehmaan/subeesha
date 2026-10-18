A.ready(function () {
    var map = { pyCod: "cod", pyEp: "easypaisa", pyJc: "jazzcash", pyCard: "online" };
    SUB.settings("payments", true).then(function (s) {
        Object.keys(map).forEach(function (id) { document.getElementById(id).classList.toggle("on", !!s[map[id]]); });
        document.getElementById("pyEpNo").value = s.easypaisaNumber || ""; document.getElementById("pyJcNo").value = s.jazzcashNumber || "";
    });
    window.savePayments = function () {
        var d = { easypaisaNumber: A.val("pyEpNo"), jazzcashNumber: A.val("pyJcNo") };
        Object.keys(map).forEach(function (id) { d[map[id]] = document.getElementById(id).classList.contains("on"); });
        if (!d.cod && !d.easypaisa && !d.jazzcash && !d.online) return A.toast("Enable at least one payment method.");
        SUB.saveSettings("payments", d).then(function () { A.toast("Payment settings saved"); }).catch(A.err);
    };
});
