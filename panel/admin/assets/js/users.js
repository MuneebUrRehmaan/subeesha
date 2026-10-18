/* Users management (Super Admin): customers, resellers and administrators */
A.ready(function () {
    var esc = SUB.esc, users = [], type = "all", ROLES = ["Super Admin", "Manager", "Staff", "Delivery Manager"];
    var tbody = document.getElementById("usersTable"), empty = document.getElementById("emptyUsers");

    function typeOf(u) { return u.role === "admin" ? "admin" : u.role === "reseller" ? "reseller" : "user"; }
    function badge(t) {
        var m = { admin: ["type-admin", "user-shield", "Admin"], reseller: ["type-reseller", "handshake", "Reseller"], user: ["type-user", "user", "Customer"] }[t];
        return '<span class="user-type ' + m[0] + '"><i class="fa-solid fa-' + m[1] + '"></i> ' + m[2] + "</span>";
    }
    function stat(u) { return SUB.isBlocked(u) ? "blocked" : (u.status === "pending" ? "pending" : "active"); }

    function render() {
        var q = (document.getElementById("userSearch").value || "").toLowerCase().trim(), sf = document.getElementById("statusFilter").value;
        var l = users.filter(function (u) {
            return (type === "all" || typeOf(u) === type) && (sf === "all" || stat(u) === sf) && (!q || [u.name, u.email].join(" ").toLowerCase().indexOf(q) > -1);
        });
        document.getElementById("totalUsers").textContent = users.length;
        document.getElementById("totalCustomers").textContent = users.filter(function (u) { return typeOf(u) === "user"; }).length;
        document.getElementById("totalResellers").textContent = users.filter(function (u) { return typeOf(u) === "reseller"; }).length;
        document.getElementById("totalAdmins").textContent = users.filter(function (u) { return typeOf(u) === "admin"; }).length;
        empty.style.display = l.length ? "none" : "block";
        tbody.innerHTML = l.map(function (u) {
            var s = stat(u), self = A.me && u.id === A.me.id;
            return '<tr><td><div class="user-info"><div class="user-avatar">' + esc(SUB.initials(u.name)) + "</div><div><b>" + esc(u.name || "-") + "</b></div></div></td><td>" + esc(u.email || "") + "</td><td>" + badge(typeOf(u)) + "</td><td>" + esc(u.role === "admin" ? (u.adminRole || "-") : u.role === "reseller" ? "Reseller" : "Customer") + '</td><td><span class="status ' + s + '">' + s.charAt(0).toUpperCase() + s.slice(1) + "</span></td><td>" + esc(u.access || "Allowed") + "</td>" +
                '<td><div class="action-buttons"><button class="action-btn action-view" title="View" onclick="viewUser(\'' + esc(u.id) + '\')"><i class="fa-solid fa-eye"></i></button>' +
                (u.role === "admin" ? '<button class="action-btn action-edit" title="Change role" onclick="editAdmin(\'' + esc(u.id) + '\')"><i class="fa-solid fa-pen"></i></button>' : "") +
                (self ? "" : '<button class="action-btn ' + (s === "blocked" ? "action-unblock" : "action-block") + '" title="' + (s === "blocked" ? "Unblock" : "Block") + '" onclick="blockUser(\'' + esc(u.id) + '\')"><i class="fa-solid fa-' + (s === "blocked" ? "lock-open" : "ban") + '"></i></button>') + "</div></td></tr>";
        }).join("");
    }
    function load() {
        tbody.innerHTML = '<tr><td colspan="7" class="a-empty"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
        return SUB.db.collection("users").get().then(function (s) { users = SUB.docs(s).sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); }); render(); }).catch(A.err);
    }
    window.filterUsers = render;
    window.setUserFilter = function (t, btn) {
        type = t; document.querySelectorAll(".user-filter-btn").forEach(function (b) { b.classList.remove("active"); }); btn.classList.add("active"); render();
    };
    window.showUserToast = A.toast;
    var gs = document.getElementById("globalSearchInput"); if (gs) gs.oninput = function () { document.getElementById("userSearch").value = gs.value; render(); };
    load();

    window.viewUser = function (id) {
        var u = users.filter(function (x) { return x.id === id; })[0];
        openModal("User Details", '<div class="a-kv"><b>Name</b><span>' + esc(u.name) + "</span><b>Email</b><span>" + esc(u.email) + "</span><b>Type</b><span>" + esc(u.role) + (u.adminRole ? " · " + esc(u.adminRole) : "") + "</span><b>Status</b><span>" + esc(u.status) + " / " + esc(u.access || "Allowed") + "</span><b>Joined</b><span>" + A.date(u.createdAt) + "</span>" + (u.resellerCode ? "<b>Reseller code</b><span>" + esc(u.resellerCode) + "</span>" : "") + "</div>" +
            '<p style="margin-top:12px"><button class="btn small secondary" onclick="resetUser(\'' + esc(u.id) + '\')"><i class="fa-solid fa-key"></i> Send password reset email</button></p>', function () { closeModal(); }, "Close");
    };
    window.resetUser = function (id) { var u = users.filter(function (x) { return x.id === id; })[0]; SUB.resetPassword(u.email).then(function () { A.toast("Reset email sent to " + u.email); }).catch(A.err); };
    window.blockUser = function (id) {
        var u = users.filter(function (x) { return x.id === id; })[0], b = SUB.isBlocked(u);
        A.confirmDo((b ? "Unblock " : "Block ") + (u.name || u.email) + "?", function () {
            return SUB.db.collection("users").doc(id).update({ status: b ? "active" : "blocked", access: b ? "Allowed" : "Suspended" }).then(function () { A.toast(b ? "User unblocked" : "User blocked"); return load(); });
        });
    };
    window.editAdmin = function (id) {
        var u = users.filter(function (x) { return x.id === id; })[0];
        openModal("Change Admin Role - " + u.name, '<div class="field full"><label>Role</label><select id="uRole">' + ROLES.map(function (r) { return "<option" + (u.adminRole === r ? " selected" : "") + ">" + r + "</option>"; }).join("") + "</select></div>" +
            '<p class="label" style="margin-top:8px"><b>Super Admin</b> full access · <b>Manager</b> everything except admin users &amp; system · <b>Staff</b> products, orders, customers · <b>Delivery Manager</b> orders only (ship).</p>',
            A.save(function () {
                if (id === A.me.id && A.val("uRole") !== "Super Admin") throw new Error("You cannot remove your own Super Admin role.");
                return SUB.db.collection("users").doc(id).update({ adminRole: A.val("uRole") }).then(function () { A.toast("Role updated"); return load(); });
            }), "Save");
    };
    window.openUserModal = function () {
        openModal("Add New User",
            '<div class="form-group"><label>Full Name *</label><input id="nuName"></div><div class="form-group"><label>Email *</label><input id="nuEmail" type="email"></div>' +
            '<div class="form-group"><label>User Type</label><select id="nuType" onchange="document.getElementById(\'nuRoleBox\').style.display=this.value===\'admin\'?\'block\':\'none\'"><option value="customer">Customer</option><option value="reseller">Reseller</option><option value="admin">Admin</option></select></div>' +
            '<div class="form-group" id="nuRoleBox" style="display:none"><label>Admin Role</label><select id="nuRole">' + ROLES.map(function (r) { return "<option" + (r === "Staff" ? " selected" : "") + ">" + r + "</option>"; }).join("") + "</select></div>" +
            '<div class="form-group"><label>Phone (optional)</label><input id="nuPhone"></div><p class="label">A one-time temporary password is generated and shown after saving.</p>',
            A.save(function () {
                var o = { name: A.val("nuName"), email: A.val("nuEmail").toLowerCase(), phone: A.val("nuPhone") }, t = A.val("nuType");
                if (!o.name || !o.email) throw new Error("Name and email are required.");
                var p;
                if (t === "reseller") p = A.createReseller(o);
                else {
                    var pass = SUB.randomPassword();
                    p = SUB.createAccount(o.email, pass).then(function (uid) {
                        var d = { name: o.name, email: o.email, whatsapp: o.phone, role: t === "admin" ? "admin" : "customer", status: "active", access: "Allowed", points: 0, wallet: 0, walletUsed: 0, createdAt: SUB.now() };
                        if (t === "admin") d.adminRole = A.val("nuRole");
                        return SUB.db.collection("users").doc(uid).set(d).then(function () { return { password: pass, code: "-" }; });
                    });
                }
                return p.then(function (r) { load(); setTimeout(function () { A.showCredentials("User Created", o.email, r.password, r.code || "-"); }, 200); return true; })
                    .catch(function (e) { throw new Error(e.code === "auth/email-already-in-use" ? "This email already has an account." : SUB.authError(e)); });
            }), "Save User");
    };
});
