/* Reseller applications - Spark compatible approval */
A.ready(function () {
    var body = document.getElementById("appBody"), list = [], esc = SUB.esc;
    A.loading(body, 7);

    function draw() {
        var f = document.getElementById("fStatus").value;
        var filtered = list.filter(function (a) { return !f || a.status === f; });
        A.rows(body, filtered, 7, "No applications.", function (a) {
            var applicant = a.applicantUid ? "Account linked" : "Legacy application";
            return "<tr><td><b>" + esc(a.fullName) + "</b><br><small style='color:#88938f'>" + applicant + "</small></td><td>" + esc(a.email) + "<br><small style='color:#88938f'>" + esc(a.phone) + "</small></td><td>" + esc(a.city) + "</td><td>" + esc(a.paymentMethod) + "</td><td>" + A.date(a.createdAt) + "</td><td>" + A.pill(a.status) + "</td>" +
                "<td style=\"white-space:nowrap\"><button class=\"btn small secondary\" onclick=\"viewApp('" + esc(a.id) + "')\"><i class=\"fa-solid fa-eye\"></i></button>" +
                (a.status === "Pending" ? " <button class=\"btn small primary\" onclick=\"approveApp('" + esc(a.id) + "')\">Approve</button> <button class=\"btn small danger\" onclick=\"rejectApp('" + esc(a.id) + "')\">Reject</button>" : "") + "</td></tr>";
        });
    }

    function load() {
        return A.load("resellerApplications", true).then(function (items) {
            list = items.sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); });
            draw();
        }).catch(A.err);
    }

    document.getElementById("fStatus").onchange = draw;
    load();

    var LBL = { profilePicture: "Profile Picture", cnicFront: "CNIC Front", cnicBack: "CNIC Back", chequePicture: "Cheque / Account Proof", feeReceipt: "Fee Receipt" };

    window.viewApp = function (id) {
        var app = list.filter(function (x) { return x.id === id; })[0];
        if (!app) return;
        var docs = app.documents || {};
        var safe = function (url) { return /^https:\/\/res\.cloudinary\.com\//.test(url) ? url : "#"; };
        openModal("Application - " + app.fullName,
            '<div class="a-kv"><b>Email</b><span>' + esc(app.email) + "</span><b>Phone</b><span>" + esc(app.phone) + "</span><b>City</b><span>" + esc(app.city) + "</span><b>CNIC</b><span>" + esc(app.cnic) + "</span><b>Payout</b><span>" + esc(app.paymentMethod) + " · " + esc(app.accountNumber) + "</span><b>Account</b><span>" + (app.applicantUid ? "Linked" : "Not linked (older application)") + "</span><b>Status</b><span>" + A.pill(app.status) + "</span>" + (app.reason ? "<b>Reason</b><span>" + esc(app.reason) + "</span>" : "") + "</div>" +
            '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:10px">' + Object.keys(LBL).filter(function (key) { return docs[key]; }).map(function (key) {
                var url = String(docs[key]).split("?")[0];
                var ext = (url.match(/\.([a-z0-9]{2,8})$/i) || ["", ""])[1].toLowerCase();
                var isImage = /^(jpg|jpeg|png|webp|gif|avif|bmp|tif|tiff|svg|heic|heif)$/i.test(ext);
                var icon = ext === "pdf" ? "fa-file-pdf" : /^(doc|docx|rtf|odt)$/i.test(ext) ? "fa-file-word" : /^(xls|xlsx|csv|ods)$/i.test(ext) ? "fa-file-excel" : /^(ppt|pptx|odp)$/i.test(ext) ? "fa-file-powerpoint" : "fa-file-lines";
                var preview = isImage
                    ? '<img src="' + esc(SUB.img(docs[key], 300)) + '" style="width:130px;height:90px;object-fit:cover;border-radius:4px" alt="">'
                    : '<div style="width:130px;height:90px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px;background:#f2f5f3;border-radius:4px"><i class="fa-solid ' + icon + '" style="font-size:24px;color:#0e3d34"></i><small style="color:#66736c">' + esc(ext ? ext.toUpperCase() : "FILE") + "</small></div>";
                return '<a href="' + esc(safe(docs[key])) + '" target="_blank" rel="noopener" style="width:130px;text-align:center;font-size:11px;color:inherit">' + preview + "<br>" + LBL[key] + "</a>";
            }).join("") + "</div>", function () { closeModal(); }, "Close");
    };

    window.approveApp = function (id) {
        var app = list.filter(function (x) { return x.id === id; })[0];
        if (!app) return;

        function approve(password) {
            return A.approveResellerApplication(id, password).then(function (result) {
                return load().then(function () {
                    A.showCredentials("Reseller Approved", app.email, result.password, result.code, !!result.existingAccount);
                });
            }).catch(A.err);
        }

        if (app.applicantUid) {
            if (!confirm("Approve " + app.fullName + " as a reseller? Their existing Subeesha login will be converted to a reseller account.")) return;
            approve(null);
            return;
        }

        // Old applications were submitted before applicants created an account.
        var generated = SUB.randomPassword();
        openModal("Approve Older Application",
            '<p class="label">This application has no linked login. A new Firebase Auth login will be created for this applicant. Copy and share the temporary password after approval.</p>' +
            '<div class="field full"><label>Temporary password</label><input id="legacyResellerPassword" type="text" minlength="6" value="' + esc(generated) + '"></div>',
            A.save(function () {
                var password = A.val("legacyResellerPassword");
                if (password.length < 6) throw new Error("Temporary password must contain at least 6 characters.");
                return A.approveResellerApplication(id, password).then(function (result) {
                    return load().then(function () {
                        setTimeout(function () {
                            A.showCredentials("Reseller Approved", app.email, result.password, result.code, !!result.existingAccount);
                        }, 150);
                        return true;
                    });
                });
            }), "Create & Approve");
    };

    window.rejectApp = function (id) {
        openModal("Reject Application", '<div class="field full"><label>Reason (optional)</label><input id="rjReason"></div>', A.save(function () {
            return SUB.db.collection("resellerApplications").doc(id).update({
                status: "Rejected",
                reason: A.val("rjReason"),
                processedAt: SUB.now(),
                processedBy: A.me.name
            }).then(function () {
                A.refreshBadges();
                A.toast("Application rejected");
                return load();
            });
        }), "Reject");
    };
});
