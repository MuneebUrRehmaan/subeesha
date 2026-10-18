/* Reseller applications */
A.ready(function () {
    var body = document.getElementById("appBody"), list = [], esc = SUB.esc;
    A.loading(body, 7);
    function draw() {
        var f = document.getElementById("fStatus").value, l = list.filter(function (a) { return !f || a.status === f; });
        A.rows(body, l, 7, "No applications.", function (a) {
            return "<tr><td><b>" + esc(a.fullName) + "</b></td><td>" + esc(a.email) + "<br><small style='color:#88938f'>" + esc(a.phone) + "</small></td><td>" + esc(a.city) + "</td><td>" + esc(a.paymentMethod) + "</td><td>" + A.date(a.createdAt) + "</td><td>" + A.pill(a.status) + "</td>" +
                '<td style="white-space:nowrap"><button class="btn small secondary" onclick="viewApp(\'' + esc(a.id) + '\')"><i class="fa-solid fa-eye"></i></button>' +
                (a.status === "Pending" ? ' <button class="btn small primary" onclick="approveApp(\'' + esc(a.id) + '\')">Approve</button> <button class="btn small danger" onclick="rejectApp(\'' + esc(a.id) + '\')">Reject</button>' : "") + "</td></tr>";
        });
    }
    function load() { return A.load("resellerApplications", true).then(function (l) { list = l.sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); }); draw(); }).catch(A.err); }
    document.getElementById("fStatus").onchange = draw;
    load();
    var LBL = { profilePicture: "Profile Picture", cnicFront: "CNIC Front", cnicBack: "CNIC Back", chequePicture: "Cheque / Account Proof", feeReceipt: "Fee Receipt" };
    window.viewApp = function (id) {
        var a = list.filter(function (x) { return x.id === id; })[0], d = a.documents || {};
        var safe = function (u) { return /^https:\/\/res\.cloudinary\.com\//.test(u) ? u : "#"; };
        openModal("Application - " + a.fullName,
            '<div class="a-kv"><b>Email</b><span>' + esc(a.email) + "</span><b>Phone</b><span>" + esc(a.phone) + "</span><b>City</b><span>" + esc(a.city) + "</span><b>CNIC</b><span>" + esc(a.cnic) + "</span><b>Payout</b><span>" + esc(a.paymentMethod) + " · " + esc(a.accountNumber) + "</span><b>Status</b><span>" + A.pill(a.status) + "</span>" + (a.reason ? "<b>Reason</b><span>" + esc(a.reason) + "</span>" : "") + "</div>" +
            '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:10px">' + Object.keys(LBL).filter(function (k) { return d[k]; }).map(function (k) {
                var isPdf = /\.pdf($|\?)/i.test(d[k]);
                return '<a href="' + esc(safe(d[k])) + '" target="_blank" rel="noopener" style="width:130px;text-align:center;font-size:11px;color:inherit">' + (isPdf ? '<div style="height:90px;display:flex;align-items:center;justify-content:center;background:#f2f5f3;border-radius:8px"><i class="fa-solid fa-file-pdf" style="font-size:30px"></i></div>' : '<img src="' + esc(SUB.img(d[k], 300)) + '" style="width:130px;height:90px;object-fit:cover;border-radius:8px" alt="">') + "<br>" + LBL[k] + "</a>";
            }).join("") + "</div>", function () { closeModal(); }, "Close");
    };
    window.approveApp = function (id) {
        var a = list.filter(function (x) { return x.id === id; })[0];
        if (!confirm("Approve " + a.fullName + " as a reseller? A login will be created.")) return;
        A.createReseller({ name: a.fullName, email: a.email.toLowerCase(), phone: a.phone, city: a.city, paymentMethod: a.paymentMethod, account: a.accountNumber }).then(function (r) {
            return SUB.db.collection("resellerApplications").doc(id).update({ status: "Approved", resellerUid: r.uid, resellerCode: r.code, processedAt: SUB.now(), processedBy: A.me.name }).then(function () {
                A.refreshBadges(); load(); A.showCredentials("Reseller Approved", a.email, r.password, r.code);
            });
        }).catch(function (e) { A.err(e.code === "auth/email-already-in-use" ? new Error("This email already has an account. Ask the applicant to apply with a different email.") : e); });
    };
    window.rejectApp = function (id) {
        openModal("Reject Application", '<div class="field full"><label>Reason (optional)</label><input id="rjReason"></div>', A.save(function () {
            return SUB.db.collection("resellerApplications").doc(id).update({ status: "Rejected", reason: A.val("rjReason"), processedAt: SUB.now(), processedBy: A.me.name }).then(function () { A.refreshBadges(); A.toast("Application rejected"); return load(); });
        }), "Reject");
    };
});
