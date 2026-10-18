A.ready(function () {
    SUB.settings("shipping", true).then(function (s) {
        document.getElementById("shCharge").value = s.charge; document.getElementById("shFree").value = s.freeAbove; document.getElementById("shPartner").value = s.partner || "";
    });
    window.saveShipping = function () {
        var d = { charge: A.num("shCharge"), freeAbove: A.num("shFree"), partner: A.val("shPartner") };
        if (d.charge < 0 || d.freeAbove < 0) return A.toast("Values cannot be negative.");
        SUB.saveSettings("shipping", d).then(function () { A.toast("Shipping settings saved"); }).catch(A.err);
    };
});
