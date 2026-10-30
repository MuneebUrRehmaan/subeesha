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

    /* ---------- email notifications ---------- */
    var $ = function (id) { return document.getElementById(id); };
    window.emProvChange = function () { var f = $("emProv").value === "firebase"; $("emJs").style.display = f ? "none" : ""; $("emFb").style.display = f ? "" : "none"; };
    if (!A.isMgr()) $("emailCard").style.display = "none";
    SUB.mail.cfg(true).then(function (c) {
        $("emOn").classList.toggle("on", !!c.enabled); $("emProv").value = c.provider || "emailjs"; $("emFrom").value = c.fromName || "";
        $("emAdmin").value = c.adminEmail || ""; $("emSvc").value = c.emailjs.service || ""; $("emTpl").value = c.emailjs.template || ""; $("emKey").value = c.emailjs.key || "";
        $("emCust").checked = c.toCustomer !== false; $("emAd").checked = c.toAdmin !== false; $("emSt").checked = c.onStatus !== false;
        $("emTest").value = c.adminEmail || ""; emProvChange();
    });
    function emData() {
        return { enabled: $("emOn").classList.contains("on"), provider: $("emProv").value, fromName: A.val("emFrom") || "Subeesha", adminEmail: A.val("emAdmin"),
            toCustomer: $("emCust").checked, toAdmin: $("emAd").checked, onStatus: $("emSt").checked, emailjs: { service: A.val("emSvc"), template: A.val("emTpl"), key: A.val("emKey") } };
    }
    window.saveEmail = function () {
        var d = emData();
        if (d.enabled && d.toAdmin && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.adminEmail)) return A.toast("Enter a valid admin email, or untick the admin alert.");
        if (d.enabled && d.provider === "emailjs" && (!d.emailjs.service || !d.emailjs.template || !d.emailjs.key)) return A.toast("EmailJS Service ID, Template ID and Public Key are required.");
        SUB.saveSettings("email", d).then(function () { A.toast(d.enabled ? "Email notifications are ON" : "Email notifications are OFF"); }).catch(A.err);
    };
    window.testEmail = function () {
        var to = A.val("emTest"); if (!to) return A.toast("Enter an email address for the test.");
        SUB.saveSettings("email", emData()).then(function () { return SUB.mail.test(to); }).then(function () { A.toast("Test email sent to " + to + " (check spam too)"); }).catch(A.err);
    };
});
