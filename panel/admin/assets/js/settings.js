A.ready(function () {
    SUB.settings("store", true).then(function (s) {
        document.getElementById("stName").value = s.name || ""; document.getElementById("stEmail").value = s.email || "";
        document.getElementById("stPhone").value = s.phone || ""; document.getElementById("stLow").value = s.lowStock; document.getElementById("stAddr").value = s.address || "";
    });
    document.getElementById("myAcc").textContent = (A.me.name || "") + " · " + (A.me.email || "") + " · " + (A.me.adminRole || "");
    if (!A.isMgr()) document.getElementById("demoCard").style.display = "none";
    window.saveSettings = function () {
        var d = { name: A.val("stName"), email: A.val("stEmail"), phone: A.val("stPhone"), lowStock: A.num("stLow"), address: A.val("stAddr") };
        if (!d.name) return A.toast("Store name is required.");
        SUB.saveSettings("store", d).then(function () { A.toast("Settings saved"); }).catch(A.err);
    };
    window.resetMyPassword = function () { SUB.resetPassword(A.me.email).then(function () { A.toast("Reset link sent to " + A.me.email); }).catch(A.err); };
    window.importDemo = function () { A.importDemo(); };
});
