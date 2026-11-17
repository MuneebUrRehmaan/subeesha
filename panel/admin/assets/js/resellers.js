/* Resellers - account status, assigned catalog and commission overview */
A.ready(function () {
    var body = document.getElementById("resBody"), list = [], esc = SUB.esc;
    A.loading(body, 9);

    function draw() {
        var query = document.getElementById("fSearch").value.toLowerCase().trim();
        var filtered = list.filter(function (r) {
            return !query || [r.name, r.email, r.resellerCode, r.city].join(" ").toLowerCase().indexOf(query) > -1;
        });

        A.rows(body, filtered, 9, "No resellers yet.", function (r) {
            var stats = r._s || {}, blocked = SUB.isBlocked(r);
            var assignedCount = Array.isArray(r.assignedProductIds) ? r.assignedProductIds.length : 0;
            return "<tr><td><b>" + esc(r.name) + "</b><br><small style='color:#88938f'>" + esc(r.email) + " · " + esc(r.phone || r.whatsapp || "") + "</small></td>" +
                "<td><code>" + esc(r.resellerCode || "-") + "</code></td>" +
                "<td>" + esc(r.paymentMethod || "-") + "<br><small style='color:#88938f'>" + esc(r.account || "") + "</small></td>" +
                "<td><b>" + assignedCount + "</b> assigned</td>" +
                "<td>" + (stats.orders || 0) + "</td><td>" + A.money(stats.sales) + "</td><td>" + A.money(stats.earned) + "</td>" +
                "<td>" + A.pill(blocked ? "Blocked" : "Active") + "</td>" +
                "<td style=\"white-space:nowrap\"><button class=\"btn small secondary\" onclick=\"assignResellerProducts('" + esc(r.id) + "')\" title=\"Assign products\"><i class=\"fa-solid fa-boxes-stacked\"></i> Assign</button> " +
                "<button class=\"btn small secondary\" onclick=\"resetReseller('" + esc(r.id) + "')\" title=\"Send password reset email\"><i class=\"fa-solid fa-key\"></i></button> " +
                "<button class=\"btn small " + (blocked ? "primary" : "danger") + "\" onclick=\"toggleReseller('" + esc(r.id) + "')\">" + (blocked ? "Unblock" : "Block") + "</button></td></tr>";
        });
    }

    function load() {
        return Promise.all([A.usersBy("reseller"), SUB.db.collection("orders").get()]).then(function (results) {
            var stats = A.resellerStats(SUB.docs(results[1]));
            list = results[0].map(function (r) { r._s = stats[r.id]; return r; })
                .sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); });
            draw();
        }).catch(A.err);
    }

    document.getElementById("fSearch").oninput = A.debounce(draw, 150);
    load();

    window.toggleReseller = function (id) {
        var reseller = list.filter(function (x) { return x.id === id; })[0];
        if (!reseller) return;
        var blocked = SUB.isBlocked(reseller);
        A.confirmDo((blocked ? "Unblock " : "Block ") + reseller.name + "?", function () {
            return SUB.db.collection("users").doc(id).update({
                status: blocked ? "active" : "blocked",
                access: blocked ? "Allowed" : "Suspended",
                updatedAt: SUB.now()
            }).then(function () { A.toast("Reseller updated"); return load(); });
        });
    };

    window.resetReseller = function (id) {
        var reseller = list.filter(function (x) { return x.id === id; })[0];
        if (!reseller) return;
        SUB.resetPassword(reseller.email).then(function () {
            A.toast("Password reset email sent to " + reseller.email);
        }).catch(A.err);
    };

    window.assignResellerProducts = function (id) {
        var reseller = list.filter(function (x) { return x.id === id; })[0];
        if (!reseller) return;

        A.load("products", true).then(function (allProducts) {
            var assigned = Array.isArray(reseller.assignedProductIds) ? reseller.assignedProductIds : [];
            // Keep previously assigned inactive products in the list so admins can unassign them.
            var products = allProducts.filter(function (p) {
                return p.active !== false || assigned.indexOf(p.id) > -1;
            }).sort(function (a, b) {
                return String(a.name || "").localeCompare(String(b.name || ""));
            });
            if (!products.length) {
                openModal("Assign Products - " + reseller.name,
                    '<p class="a-empty">There are no active products to assign. Add or activate products first.</p>',
                    function () { closeModal(); }, "Close");
                return;
            }

            var content = '<p class="label">Select the products this reseller is allowed to display, share and sell. Unselected products will not appear in their reseller panel.</p>' +
                '<div style="display:flex;gap:8px;align-items:center;margin:12px 0"><input id="assignProductSearch" class="search" placeholder="Search products..." style="width:100%"><span id="assignedCount" class="label" style="white-space:nowrap">' + assigned.length + ' selected</span></div>' +
                '<div id="assignProductList" style="max-height:420px;overflow:auto;border:1px solid #e4eae6;border-radius:4px;padding:8px">' +
                products.map(function (p) {
                    var idSafe = esc(p.id);
                    var checked = assigned.indexOf(p.id) > -1;
                    var image = (p.images || [])[0];
                    return '<label data-product-name="' + esc(String(p.name || "").toLowerCase()) + '" style="display:flex;gap:10px;align-items:center;padding:9px 6px;border-bottom:1px solid #edf1ee;cursor:pointer">' +
                        '<input type="checkbox" class="assigned-product-check" value="' + idSafe + '"' + (checked ? " checked" : "") + ' style="width:16px;height:16px;flex:0 0 auto">' +
                        (image ? '<img src="' + esc(SUB.img(image, 100)) + '" alt="" style="width:42px;height:42px;object-fit:contain;background:#f7f9f8;border-radius:4px">' : '<span style="width:42px;height:42px;background:#f7f9f8;border-radius:4px;display:grid;place-items:center"><i class="fa-solid fa-box"></i></span>') +
                        '<span style="min-width:0;flex:1"><b style="display:block;font-size:12px">' + esc(p.name || "Untitled product") + (p.active === false ? ' <small style="color:#b87516">(Inactive)</small>' : '') + '</b><small style="color:#88938f">' + esc(p.category || "") + ' · ' + A.money(p.price) + ' · ' + SUB.num(p.commission) + '% commission</small></span></label>';
                }).join("") + '</div>';

            openModal("Assign Products - " + reseller.name, content, A.save(function () {
                var ids = Array.prototype.slice.call(document.querySelectorAll(".assigned-product-check:checked"))
                    .map(function (input) { return input.value; });
                return SUB.db.collection("users").doc(id).update({
                    assignedProductIds: ids,
                    updatedAt: SUB.now()
                }).then(function () {
                    A.toast(ids.length + " product(s) assigned to " + reseller.name);
                    return load();
                });
            }), "Save Assignments");

            var search = document.getElementById("assignProductSearch");
            var count = document.getElementById("assignedCount");
            var updateCount = function () {
                if (count) count.textContent = document.querySelectorAll(".assigned-product-check:checked").length + " selected";
            };
            search.addEventListener("input", function () {
                var q = search.value.toLowerCase().trim();
                document.querySelectorAll("#assignProductList label[data-product-name]").forEach(function (label) {
                    label.style.display = !q || label.getAttribute("data-product-name").indexOf(q) > -1 ? "flex" : "none";
                });
            });
            document.querySelectorAll(".assigned-product-check").forEach(function (input) {
                input.addEventListener("change", updateCount);
            });
        }).catch(A.err);
    };
});
