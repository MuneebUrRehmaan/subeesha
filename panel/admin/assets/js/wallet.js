/* Digital wallet - balances, manual adjustments */
A.ready(function () {
    var body = document.getElementById("walBody"), list = [], esc = SUB.esc;
    A.loading(body, 5);
    function draw() {
        var q = document.getElementById("fSearch").value.toLowerCase().trim();
        var l = list.filter(function (u) { return !q || [u.name, u.email].join(" ").toLowerCase().indexOf(q) > -1; });
        document.getElementById("wStats").innerHTML = [["Total wallet balance", A.money(list.reduce(function (s, u) { return s + SUB.num(u.wallet); }, 0)), "wallet"], ["Total points", list.reduce(function (s, u) { return s + SUB.num(u.points); }, 0).toLocaleString(), "star"], ["Wallet used to date", A.money(list.reduce(function (s, u) { return s + SUB.num(u.walletUsed); }, 0)), "cart-shopping"]]
            .map(function (x) { return '<div class="card stat"><div><span class="label">' + x[0] + '</span><div class="value">' + x[1] + '</div></div><div class="ico"><i class="fa-solid fa-' + x[2] + '"></i></div></div>'; }).join("");
        A.rows(body, l, 5, "No customers yet.", function (u) {
            return "<tr><td><b>" + esc(u.name) + "</b><br><small style='color:#88938f'>" + esc(u.email) + "</small></td><td>" + SUB.num(u.points).toLocaleString() + "</td><td>" + A.money(u.wallet) + "</td><td>" + A.pill(SUB.isBlocked(u) ? "Blocked" : "Active") + "</td>" +
                '<td><button class="btn small secondary" onclick="adjustWallet(\'' + esc(u.id) + '\')"><i class="fa-solid fa-sliders"></i> Adjust</button> <button class="btn small secondary" onclick="walletHistory(\'' + esc(u.id) + '\')"><i class="fa-solid fa-clock-rotate-left"></i></button></td></tr>';
        });
    }
    function load() { return A.usersBy("customer").then(function (l) { list = l.sort(function (a, b) { return SUB.num(b.wallet) - SUB.num(a.wallet); }); draw(); }).catch(A.err); }
    document.getElementById("fSearch").oninput = A.debounce(draw, 150);
    load();
    window.adjustWallet = function (id) {
        var u = list.filter(function (x) { return x.id === id; })[0];
        openModal("Adjust - " + u.name,
            '<div class="a-kv"><b>Points</b><span>' + SUB.num(u.points) + "</span><b>Wallet</b><span>" + A.money(u.wallet) + "</span></div>" +
            '<div class="form-grid"><div class="field"><label>Adjustment</label><select id="wType"><option value="w+">Add to wallet (Rs.)</option><option value="w-">Deduct from wallet (Rs.)</option><option value="p+">Add points</option><option value="p-">Deduct points</option></select></div>' +
            '<div class="field"><label>Amount *</label><input id="wAmt" type="number" min="1"></div><div class="field full"><label>Reason / note *</label><input id="wNote" placeholder="e.g. Goodwill credit"></div></div>',
            A.save(function () {
                var t = A.val("wType"), amt = A.num("wAmt"), note = A.val("wNote");
                if (amt <= 0 || !note) throw new Error("Enter an amount and a reason.");
                var isW = t[0] === "w", sign = t[1] === "+" ? 1 : -1, ref = SUB.db.collection("users").doc(id), FV = SUB.FV;
                return SUB.db.runTransaction(function (tx) {
                    return tx.get(ref).then(function (s) {
                        var d = s.data(), cur = SUB.num(isW ? d.wallet : d.points);
                        if (sign < 0 && cur < amt) throw new Error("Balance is lower than the amount to deduct.");
                        tx.update(ref, isW ? { wallet: FV.increment(sign * amt) } : { points: FV.increment(sign * amt) });
                        if (isW) tx.set(SUB.db.collection("walletTransactions").doc(), { uid: id, title: note, amount: sign * amt, createdAt: SUB.now(), by: A.me.name });
                        else tx.set(SUB.db.collection("rewardLog").doc(), { uid: id, points: sign * amt, reason: sign > 0 ? "Admin Bonus" : "Admin Adjustment", note: note, createdAt: SUB.now() });
                    });
                }).then(function () { A.toast("Balance updated"); return load(); });
            }), "Apply");
    };
    window.walletHistory = function (id) {
        Promise.all([SUB.db.collection("walletTransactions").where("uid", "==", id).get(), SUB.db.collection("rewardLog").where("uid", "==", id).get()]).then(function (r) {
            var rows = SUB.docs(r[0]).map(function (t) { return { t: t.createdAt, a: t.title, v: (t.amount >= 0 ? "+" : "-") + "Rs. " + Math.abs(t.amount) }; })
                .concat(SUB.docs(r[1]).map(function (t) { return { t: t.createdAt, a: t.reason + (t.note ? " · " + t.note : ""), v: (t.points >= 0 ? "+" : "") + t.points + " pts" }; }))
                .sort(function (a, b) { return SUB.ms(b.t) - SUB.ms(a.t); }).slice(0, 40);
            openModal("History", rows.length ? '<div class="table-wrap"><table class="table"><tbody>' + rows.map(function (x) { return "<tr><td>" + SUB.date(x.t) + "</td><td>" + esc(x.a) + "</td><td><b>" + esc(x.v) + "</b></td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="a-empty">No activity.</p>', function () { closeModal(); }, "Close");
        }).catch(A.err);
    };
});
