/* Customers */
A.ready(function () {
    var body = document.getElementById("custBody"), list = [], esc = SUB.esc;
    A.loading(body, 9);
    function draw() {
        var q = document.getElementById("fSearch").value.toLowerCase().trim();
        var l = list.filter(function (c) { return !q || [c.name, c.email, c.whatsapp].join(" ").toLowerCase().indexOf(q) > -1; });
        A.rows(body, l, 9, "No customers found.", function (c) {
            var blocked = SUB.isBlocked(c);
            return "<tr><td><b>" + esc(c.name || "-") + "</b></td><td>" + esc(c.email || "") + "<br><small style='color:#88938f'>" + esc(c.whatsapp || "") + "</small></td><td>" + A.date(c.createdAt) + "</td><td>" + c._orders + "</td><td>" + A.money(c._spent) + "</td><td>" + SUB.num(c.points).toLocaleString() + "</td><td>" + A.money(c.wallet) + "</td><td>" + A.pill(blocked ? "Blocked" : "Active") + "</td>" +
                '<td><button class="btn small secondary" onclick="viewCustomer(\'' + esc(c.id) + '\')"><i class="fa-solid fa-eye"></i></button> ' +
                '<button class="btn small ' + (blocked ? "primary" : "danger") + '" onclick="toggleBlock(\'' + esc(c.id) + '\')">' + (blocked ? "Unblock" : "Block") + "</button></td></tr>";
        });
    }
    function load() {
        return Promise.all([A.usersBy("customer"), SUB.db.collection("orders").get()]).then(function (r) {
            var agg = {};
            SUB.docs(r[1]).forEach(function (o) { if (!o.userId || /^(Cancelled|Returned)$/.test(o.status)) return; var a = agg[o.userId] || (agg[o.userId] = { n: 0, s: 0 }); a.n++; a.s += SUB.num(o.total) + SUB.num(o.walletUsed); });
            list = r[0].map(function (c) { c._orders = (agg[c.id] || {}).n || 0; c._spent = (agg[c.id] || {}).s || 0; return c; })
                .sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); });
            draw();
        }).catch(A.err);
    }
    document.getElementById("fSearch").oninput = A.debounce(draw, 150);
    load();
    window.viewCustomer = function (id) {
        var c = list.filter(function (x) { return x.id === id; })[0];
        openModal("Customer Details", '<div class="a-kv"><b>Name</b><span>' + esc(c.name) + "</span><b>Email</b><span>" + esc(c.email) + "</span><b>WhatsApp</b><span>" + esc(c.whatsapp || "-") + "</span><b>Gender</b><span>" + esc(c.gender || "-") + "</span><b>Joined</b><span>" + A.date(c.createdAt) + "</span><b>Orders</b><span>" + c._orders + "</span><b>Total spent</b><span>" + A.money(c._spent) + "</span><b>Points</b><span>" + SUB.num(c.points) + "</span><b>Wallet</b><span>" + A.money(c.wallet) + "</span></div>", function () { closeModal(); }, "Close");
    };
    window.toggleBlock = function (id) {
        var c = list.filter(function (x) { return x.id === id; })[0], blocked = SUB.isBlocked(c);
        A.confirmDo((blocked ? "Unblock " : "Block ") + c.name + "?", function () {
            return SUB.db.collection("users").doc(id).update({ status: blocked ? "active" : "blocked", access: blocked ? "Allowed" : "Suspended" }).then(function () { A.toast(blocked ? "Customer unblocked" : "Customer blocked"); return load(); });
        });
    };
    window.exportCustomers = function () {
        var rows = [["Name", "Email", "WhatsApp", "Joined", "Orders", "Spent", "Points", "Wallet", "Status"]];
        list.forEach(function (c) { rows.push([c.name, c.email, c.whatsapp, SUB.date(c.createdAt), c._orders, c._spent, c.points, c.wallet, SUB.isBlocked(c) ? "Blocked" : "Active"]); });
        A.csv("customers.csv", rows);
    };
});
