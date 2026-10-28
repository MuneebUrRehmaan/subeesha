/* =========================================================
   SUBEESHA ADMIN CORE  (window.A)
   - login guard + role based access
   - sidebar badges, topbar user, logout
   - shared helpers (tables, images, CSV, order engine)
   Every admin page loads this after sub-core.js.
   ========================================================= */
(function (w, d) {
    "use strict";
    var A = w.A = {};
    var esc = A.esc = SUB.esc;
    A.money = SUB.money;
    A.date = SUB.date;
    A.me = null;

    /* which roles may open which page */
    var ALL = ["Super Admin", "Manager", "Staff", "Delivery Manager"];
    var STAFF = ["Super Admin", "Manager", "Staff"];
    var MGR = ["Super Admin", "Manager"];
    A.access = {
        dashboard: ALL, orders: ALL, products: STAFF, categories: STAFF, customers: STAFF, inventory: STAFF,
        resellers: MGR, "reseller-requests": MGR, "reseller-payments": MGR,
        discounts: MGR, flash: MGR, giveaway: STAFF, rewards: MGR, wallet: MGR, "conversion-requests": MGR,
        banners: STAFF, reviews: STAFF,
        shipping: MGR, payments: MGR, reports: MGR, users: ["Super Admin"], settings: MGR
    };
    A.page = (location.pathname.split("/").pop() || "index.html").replace(".html", "");
    if (A.page === "index" || A.page === "") A.page = "dashboard";
    A.role = function () { return (A.me && A.me.adminRole) || ""; };
    A.can = function (list) { return list.indexOf(A.role()) > -1; };
    A.isMgr = function () { return A.can(MGR); };
    A.isStaff = function () { return A.can(STAFF); };

    /* ---------- extra styles used by new widgets ---------- */
    var css = d.createElement("style");
    css.textContent =
        ".a-note{background:#fff6e4;border:1px solid #f0dcaa;color:#7a5a12;padding:12px 14px;border-radius:10px;font-size:12px;margin-bottom:14px;line-height:1.6}" +
        ".a-note.err{background:#fdecec;border-color:#f3c0c0;color:#8a2323}.a-note.ok{background:#eaf5ef;border-color:#bfdccb;color:#1f5a3a}" +
        ".a-empty{text-align:center;color:#88938f;padding:30px 10px;font-size:13px}" +
        ".img-mgr{border:1px dashed #cfd8d4;border-radius:12px;padding:12px;background:#fafcfb}" +
        ".img-mgr .thumbs{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px}" +
        ".img-mgr .thumb{position:relative;width:78px;height:78px;border-radius:10px;overflow:hidden;border:2px solid #e3e9e6;background:#fff}" +
        ".img-mgr .thumb.main{border-color:#0e3d34}.img-mgr .thumb img{width:100%;height:100%;object-fit:cover}" +
        ".img-mgr .thumb button{position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;background:#c62828;color:#fff;font-size:11px;line-height:1;padding:0}" +
        ".img-mgr .thumb em{position:absolute;left:0;bottom:0;right:0;background:rgba(14,61,52,.85);color:#fff;font-size:9px;text-align:center;font-style:normal;padding:1px}" +
        ".img-mgr .thumb.up{display:flex;align-items:center;justify-content:center;font-size:10px;color:#68736e}" +
        ".img-mgr small{color:#88938f;font-size:11px;display:block;margin-top:6px}" +
        ".a-login{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0e3d34,#072620);padding:20px}" +
        ".a-login .box{background:#fff;border-radius:18px;padding:34px;width:100%;max-width:400px;box-shadow:0 30px 60px rgba(0,0,0,.25)}" +
        ".a-login img{width:64px;height:64px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 12px}" +
        ".a-login h2{text-align:center;margin-bottom:4px}.a-login p.sub{text-align:center;color:#68736e;font-size:12px;margin-bottom:20px}" +
        ".a-login .field{margin-bottom:14px}.a-login .btn{width:100%;justify-content:center}" +
        ".a-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.a-tabs button{padding:8px 14px;border-radius:20px;background:#eef2f0;font-size:12px;font-weight:600}" +
        ".a-tabs button.on{background:#0e3d34;color:#fff}.a-kv{display:grid;grid-template-columns:120px 1fr;gap:6px 12px;font-size:13px;margin:6px 0}.a-kv b{color:#68736e;font-weight:600}" +
        ".a-logout{background:#fdecec !important;color:#c62828 !important}" +
        ".a-skeleton-row td{padding:14px 12px!important}.a-skeleton-bar{display:block;height:10px;max-width:180px;background:linear-gradient(100deg,#edf0ee 20%,#f8f9f8 40%,#edf0ee 60%);background-size:200% 100%;border-radius:3px;animation:a-shimmer 1.3s ease-in-out infinite}.product-card{border-radius:4px!important;transition:box-shadow .2s,border-color .2s,transform .2s}.product-card:hover{transform:translateY(-2px);border-color:#d5dfd9;box-shadow:0 8px 20px rgba(14,61,52,.08)}.product-img{border-radius:3px!important;background:#f4f6f4}.main .btn,.main .search,.main input:not([type=checkbox]):not([type=radio]):not([type=file]),.main select,.main textarea,.main .modal,.main .modal-box{border-radius:4px}.main input:focus,.main select:focus,.main textarea:focus{outline:2px solid #0e3d3422;border-color:#0e3d34}.img-mgr{border-radius:4px}.img-mgr .thumb{border-radius:3px}.a-note{border-radius:4px}.a-product-skeleton .product-img{aspect-ratio:1/1;min-height:130px}.a-skeleton-block{display:block;height:10px;width:80%;background:linear-gradient(100deg,#edf0ee 20%,#f8f9f8 40%,#edf0ee 60%);background-size:200% 100%;border-radius:3px;animation:a-shimmer 1.3s ease-in-out infinite}.a-skeleton-block.image{width:100%;height:100%}.a-skeleton-block.line{margin:8px 0}.a-skeleton-block.short{width:46%}.a-skeleton-block.price{width:35%;height:15px;margin-top:14px}.a-skeleton-block.action{width:100%;height:32px;margin-top:14px}@keyframes a-shimmer{to{background-position-x:-200%}}";
    d.head.appendChild(css);

    /* ---------- misc helpers ---------- */
    A.toast = function (m) { if (typeof w.toast === "function") w.toast(m); };
    SUB.notifyImpl = function (m) { A.toast(m); };
    A.err = function (e) {
        var m = (e && e.code === "permission-denied") ? "Permission denied for your admin role." : (e && e.message) || "Something went wrong.";
        A.toast(m); if (w.console) console.error(e);
    };
    A.statusType = function (s) {
        s = String(s || "");
        if (/^(delivered|approved|active|paid|allowed|completed|published|running|fulfilled|enabled)$/i.test(s)) return "success";
        if (/^(cancelled|rejected|blocked|suspended|returned|expired|inactive|failed|disabled)$/i.test(s)) return "danger";
        if (/^(shipped|info|draft|scheduled|ended)$/i.test(s)) return "info";
        return "pending";
    };
    A.pill = function (s, type) { return '<span class="status ' + (type || A.statusType(s)) + '">' + esc(s) + "</span>"; };
    A.rows = function (tbody, list, cols, emptyMsg, fn) {
        tbody.innerHTML = list.length ? list.map(fn).join("") : '<tr><td colspan="' + cols + '" class="a-empty">' + esc(emptyMsg || "Nothing to show yet.") + "</td></tr>";
    };
    A.loading = function (tbody, cols) {
        if (!tbody) return;
        var n = Math.max(1, Number(cols) || 5);
        var rows = '';
        for (var r = 0; r < 4; r++) {
            rows += '<tr class="a-skeleton-row">';
            for (var c = 0; c < n; c++) rows += '<td><span class="a-skeleton-bar" style="width:' + (c === 0 ? '68%' : (45 + ((r + c) % 4) * 12) + '%') + '"></span></td>';
            rows += '</tr>';
        }
        tbody.innerHTML = rows;
    };
    A.debounce = function (fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms || 200); }; };
    A.csv = function (name, rows) {
        var out = rows.map(function (r) {
            return r.map(function (c) { c = String(c == null ? "" : c); if (/^[=+\-@]/.test(c)) c = "'" + c; return '"' + c.replace(/"/g, '""') + '"'; }).join(",");
        }).join("\n");
        var a = d.createElement("a");
        a.href = URL.createObjectURL(new Blob(["\ufeff" + out], { type: "text/csv;charset=utf-8" }));
        a.download = name; d.body.appendChild(a); a.click(); a.remove();
    };
    A.val = function (id) { var e = d.getElementById(id); return e ? e.value.trim() : ""; };
    A.num = function (id) { return SUB.num(A.val(id)); };
    /* modal save handler that shows busy state and reports errors */
    A.save = function (fn) {
        return function () {
            var b = d.getElementById("modalSaveBtn");
            if (b && b.disabled) return;
            var txt = b ? b.innerText : "";
            if (b) { b.disabled = true; b.innerText = "Saving..."; }
            Promise.resolve().then(fn).then(function (r) { if (r !== false) closeModal(); })
                .catch(A.err).finally(function () { if (b) { b.disabled = false; b.innerText = txt; } });
        };
    };
    A.confirmDo = function (msg, fn) {
        if (!w.confirm(msg)) return;
        Promise.resolve().then(fn).catch(A.err);
    };
    A.ts = function () { return SUB.now(); };
    A.fromInput = function (id) { var v = A.val(id); return v ? firebase.firestore.Timestamp.fromDate(new Date(v)) : null; };
    A.toInput = function (t) {
        var x = SUB.toDate(t); if (!x) return "";
        var p = function (n) { return String(n).padStart(2, "0"); };
        return x.getFullYear() + "-" + p(x.getMonth() + 1) + "-" + p(x.getDate()) + "T" + p(x.getHours()) + ":" + p(x.getMinutes());
    };

    /* ---------- image manager (Cloudinary) ---------- */
    /* A.imageManager(container, ["url"], {max:8}) -> { urls(), busy() } */
    A.imageManager = function (box, initial, opt) {
        opt = opt || {}; var max = opt.max || 8, urls = (initial || []).slice(), uploading = 0;
        box.classList.add("img-mgr");
        box.innerHTML = '<div class="thumbs"></div><input type="file" accept="' + SUB.cloud.accept + '"' + (max > 1 ? " multiple" : "") + '><small>' +
            (max > 1 ? "First image is the main image. " : "") + "PNG, JPG, WEBP, GIF, AVIF, SVG, BMP or TIFF - up to 10 MB each.</small>";
        var thumbs = box.querySelector(".thumbs"), input = box.querySelector("input");
        function draw() {
            thumbs.innerHTML = urls.map(function (u, i) {
                return '<div class="thumb' + (i === 0 ? " main" : "") + '"><img src="' + esc(SUB.img(u, 200)) + '" alt="">' +
                    '<button type="button" data-rm="' + i + '" title="Remove">&times;</button>' + (i === 0 && max > 1 ? "<em>MAIN</em>" : "") + "</div>";
            }).join("") + (uploading ? '<div class="thumb up"><i class="fa-solid fa-spinner fa-spin"></i></div>' : "");
        }
        thumbs.addEventListener("click", function (e) {
            var b = e.target.closest("[data-rm]"); if (!b) return;
            urls.splice(Number(b.getAttribute("data-rm")), 1); draw();
        });
        input.addEventListener("change", function () {
            var files = Array.prototype.slice.call(input.files || []);
            input.value = "";
            files.slice(0, Math.max(0, max - urls.length)).forEach(function (f) {
                uploading++; draw();
                SUB.cloud.upload(f, { folder: opt.folder || "misc" }).then(function (r) {
                    if (max === 1) urls = [r.url]; else urls.push(r.url);
                }).catch(A.err).finally(function () { uploading--; draw(); });
            });
            if (files.length > max - urls.length && max > 1) A.toast("Maximum " + max + " images allowed.");
        });
        draw();
        return { urls: function () { return urls.slice(); }, busy: function () { return uploading > 0; } };
    };

    /* ---------- data loaders (cached per page view) ---------- */
    var cache = {};
    A.load = function (name, force) {
        if (cache[name] && !force) return cache[name];
        cache[name] = SUB.db.collection(name).get().then(function (s) { return SUB.docs(s); });
        return cache[name];
    };
    A.drop = function () { for (var i = 0; i < arguments.length; i++) delete cache[arguments[i]]; };
    A.usersBy = function (role) {
        return SUB.db.collection("users").where("role", "==", role).get().then(function (s) { return SUB.docs(s); });
    };
    /* reseller sales summary from orders */
    A.resellerStats = function (orders) {
        var m = {};
        orders.forEach(function (o) {
            if (!o.resellerId) return;
            var r = m[o.resellerId] || (m[o.resellerId] = { orders: 0, sales: 0, earned: 0, pending: 0 });
            if (/^(Cancelled|Returned)$/.test(o.status)) return;
            r.orders++; r.sales += SUB.num(o.total) + SUB.num(o.walletUsed);
            if (o.status === "Delivered" && !o.commissionVoid) r.earned += SUB.num(o.commission); else r.pending += SUB.num(o.commission);
        });
        return m;
    };

    /* =====================================================
       ORDER ENGINE  (stock, wallet, points, status history)
       ===================================================== */
    A.STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"];
    A.setOrderStatus = function (orderId, next) {
        var db = SUB.db, FV = SUB.FV, oref = db.collection("orders").doc(orderId);
        return Promise.all([SUB.settings("rewards", true), oref.get()]).then(function (r) {
            var rewards = r[0], pre = r[1].data();
            if (!pre) throw new Error("Order not found.");
            var firstQ = (next === "Delivered" && pre.userId && !pre.pointsAwarded)
                ? db.collection("orders").where("userId", "==", pre.userId).where("status", "==", "Delivered").limit(1).get()
                : Promise.resolve(null);
            return firstQ.then(function (q) {
                var isFirst = !!q && q.empty;
                return db.runTransaction(function (tx) {
                    return tx.get(oref).then(function (os) {
                        var o = os.data(), prev = o.status;
                        if (prev === next) return null;
                        if (["Cancelled", "Returned"].indexOf(prev) > -1) throw new Error("This order is already " + prev + " and cannot be changed.");
                        if (next === "Returned" && prev !== "Delivered") throw new Error("Only delivered orders can be marked as returned.");
                        if (next === "Cancelled" && prev === "Delivered") throw new Error("A delivered order cannot be cancelled. Mark it as Returned instead.");
                        if (next === "Pending") throw new Error("An order cannot go back to Pending.");

                        var items = (o.items || []).filter(function (i) { return i.id && String(i.id).indexOf("demo-") !== 0; });
                        var needStock = ["Processing", "Shipped", "Delivered"].indexOf(next) > -1 && !o.stockDeducted;
                        var giveBack = ["Cancelled", "Returned"].indexOf(next) > -1 && o.stockDeducted;
                        var needWallet = ["Processing", "Shipped", "Delivered"].indexOf(next) > -1 && o.userId && SUB.num(o.walletUsed) > 0 && !o.walletDebited;
                        var refund = next === "Cancelled" && o.walletDebited;
                        var award = next === "Delivered" && o.userId && !o.pointsAwarded;
                        var reverse = next === "Returned" && o.pointsAwarded && SUB.num(o.pointsGiven) > 0;

                        var reads = [];
                        if (needStock || giveBack) items.forEach(function (i) { reads.push(tx.get(db.collection("products").doc(i.id)).then(function (s) { return { i: i, s: s }; })); });
                        var userRead = (o.userId && (needWallet || refund || award || reverse)) ? tx.get(db.collection("users").doc(o.userId)) : Promise.resolve(null);

                        return Promise.all([Promise.all(reads), userRead]).then(function (x) {
                            var prods = x[0], us = x[1];
                            var upd = { status: next, updatedAt: SUB.now(), statusHistory: FV.arrayUnion({ status: next, at: Date.now(), by: (A.me && A.me.name) || "admin" }) };
                            if (needStock) {
                                prods.forEach(function (p) {
                                    if (!p.s.exists) return;
                                    var st = p.s.data().stock;
                                    if (st != null && st < p.i.qty) throw new Error("Not enough stock for " + p.i.name + " (" + st + " left).");
                                });
                                prods.forEach(function (p) {
                                    if (!p.s.exists) return;
                                    tx.update(p.s.ref, { stock: FV.increment(-p.i.qty), sold: FV.increment(p.i.qty) });
                                });
                                upd.stockDeducted = true;
                            }
                            if (giveBack) {
                                prods.forEach(function (p) {
                                    if (!p.s.exists) return;
                                    tx.update(p.s.ref, { stock: FV.increment(p.i.qty), sold: FV.increment(-p.i.qty) });
                                });
                                upd.stockDeducted = false;
                            }
                            if (needWallet) {
                                var bal = us && us.exists ? SUB.num(us.data().wallet) : 0;
                                if (bal < SUB.num(o.walletUsed)) throw new Error("Customer wallet balance is lower than the wallet amount used on this order.");
                                tx.update(us.ref, { wallet: FV.increment(-SUB.num(o.walletUsed)), walletUsed: FV.increment(SUB.num(o.walletUsed)) });
                                tx.set(db.collection("walletTransactions").doc(), { uid: o.userId, title: "Order #" + o.orderNo, amount: -SUB.num(o.walletUsed), createdAt: SUB.now() });
                                upd.walletDebited = true;
                            }
                            if (refund && us && us.exists) {
                                tx.update(us.ref, { wallet: FV.increment(SUB.num(o.walletUsed)) });
                                tx.set(db.collection("walletTransactions").doc(), { uid: o.userId, title: "Refund - Order #" + o.orderNo, amount: SUB.num(o.walletUsed), createdAt: SUB.now() });
                                upd.walletDebited = false;
                            }
                            if (award && us && us.exists) {
                                var base = Math.max(0, SUB.num(o.subtotal) - SUB.num(o.discount));
                                var pts = Math.floor(base / 100) * SUB.num(rewards.purchasePer100);
                                var first = isFirst ? SUB.num(rewards.firstOrder) : 0;
                                var total = pts + first;
                                if (total > 0) {
                                    tx.update(us.ref, { points: FV.increment(total) });
                                    if (pts > 0) tx.set(db.collection("rewardLog").doc(), { uid: o.userId, points: pts, reason: "Purchase Reward", note: "Order #" + o.orderNo, createdAt: SUB.now() });
                                    if (first > 0) tx.set(db.collection("rewardLog").doc(), { uid: o.userId, points: first, reason: "First Order Bonus", note: "Order #" + o.orderNo, createdAt: SUB.now() });
                                }
                                upd.pointsAwarded = true; upd.pointsGiven = total;
                            }
                            if (reverse && us && us.exists) {
                                tx.update(us.ref, { points: FV.increment(-SUB.num(o.pointsGiven)) });
                                tx.set(db.collection("rewardLog").doc(), { uid: o.userId, points: -SUB.num(o.pointsGiven), reason: "Order Returned", note: "Order #" + o.orderNo, createdAt: SUB.now() });
                                upd.pointsAwarded = false;
                            }
                            if (["Cancelled", "Returned"].indexOf(next) > -1 && o.resellerId) upd.commissionVoid = true;
                            tx.update(oref, upd);
                            return upd;
                        });
                    });
                });
            });
        });
    };

    /* =====================================================
       RESELLER ACCOUNT CREATION (no server needed)
       Creates the Firebase Auth login with a one-time temporary
       password (shown once, never stored) + users doc + public code.
       ===================================================== */
    A.newResellerCode = function () {
        var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", tries = 0;
        function attempt() {
            var c = "SUB", arr = new Uint32Array(4); (w.crypto || w.msCrypto).getRandomValues(arr);
            for (var i = 0; i < 4; i++) c += chars[arr[i] % chars.length];
            return SUB.db.collection("resellerCodes").doc(c).get().then(function (s) { return (s.exists && ++tries < 6) ? attempt() : c; });
        }
        return attempt();
    };
    A.createReseller = function (o) {
        var pass = SUB.randomPassword();
        return A.newResellerCode().then(function (code) {
            return SUB.createAccount(o.email, pass).then(function (uid) {
                var db = SUB.db, b = db.batch();
                b.set(db.collection("users").doc(uid), {
                    name: o.name, email: o.email, whatsapp: o.phone || "", phone: o.phone || "", role: "reseller", status: "active", access: "Allowed",
                    resellerCode: code, city: o.city || "", paymentMethod: o.paymentMethod || "", account: o.account || "", points: 0, wallet: 0, walletUsed: 0,
                    createdAt: SUB.now(), createdBy: (A.me && A.me.name) || "admin"
                });
                b.set(db.collection("resellerCodes").doc(code), { uid: uid, name: o.name });
                return b.commit().then(function () { return { uid: uid, code: code, password: pass }; });
            });
        });
    };
    A.showCredentials = function (title, email, pass, code) {
        openModal(title,
            '<div class="a-note ok">Account created. <b>Copy these login details now</b> - the password is shown only once and is not stored anywhere. The reseller can change it from the panel login page (Forgot password).</div>' +
            '<div class="a-kv"><b>Login URL</b><span>' + esc(location.origin + location.pathname.replace(/admin\/[^/]*$/, "reseller/index.html")) + "</span><b>Email</b><span>" + esc(email) + "</span><b>Password</b><span><code id=\"cPw\">" + esc(pass) + "</code></span><b>Reseller code</b><span>" + esc(code) + "</span></div>",
            function () {
                var t = "Subeesha Reseller Login\nEmail: " + email + "\nPassword: " + pass + "\nReseller code: " + code;
                if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { A.toast("Login details copied"); }); else A.toast("Select and copy manually.");
            }, "Copy details");
    };

    /* =====================================================
       BOOT: guard + chrome
       ===================================================== */
    var queue = [], booted = false;
    A.ready = function (fn) { if (booted) fn(A.me); else queue.push(fn); };

    function banner(msg, cls) {
        var c = d.querySelector(".content"); if (!c) return;
        var n = d.createElement("div"); n.className = "a-note " + (cls || "");
        n.innerHTML = msg; c.insertBefore(n, c.firstChild);
    }

    function chrome() {
        var p = A.me;
        // topbar user
        var av = d.querySelector(".admin .avatar"), nm = d.querySelector(".admin-name b"), rl = d.querySelector(".admin-name small");
        if (av) av.textContent = SUB.initials(p.name);
        if (nm) nm.textContent = p.name || "Admin";
        if (rl) rl.textContent = p.adminRole || "Admin";
        // logout button
        var ta = d.querySelector(".top-actions");
        if (ta && !d.getElementById("logoutBtn")) {
            var b = d.createElement("button");
            b.className = "icon-btn a-logout"; b.id = "logoutBtn"; b.title = "Logout";
            b.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i>';
            b.onclick = function () { SUB.signOut().then(function () { location.href = "login.html"; }); };
            ta.appendChild(b);
        }
        // hide menu items the role cannot open
        d.querySelectorAll(".nav[data-page]").forEach(function (a) {
            var pg = a.getAttribute("data-page"), allow = A.access[pg];
            if (allow && allow.indexOf(A.role()) < 0) a.style.display = "none";
        });
        d.querySelectorAll(".menu-title").forEach(function (t) {
            var n = t.nextElementSibling, vis = false;
            while (n && !n.classList.contains("menu-title")) { if (n.style.display !== "none") vis = true; n = n.nextElementSibling; }
            if (!vis) t.style.display = "none";
        });
        // global search: filter visible table rows
        w.globalSearch = function (v) {
            v = String(v || "").toLowerCase().trim();
            d.querySelectorAll(".table tbody tr").forEach(function (tr) { tr.style.display = !v || tr.innerText.toLowerCase().indexOf(v) > -1 ? "" : "none"; });
        };
        // welcome text on the dashboard
        if (A.page === "dashboard") { var sp = d.querySelector(".page-title p"); if (sp) sp.textContent = "Welcome back, " + (p.name || "").split(" ")[0] + "! Manage your store from here."; }
        badges();
    }

    function badges() {
        var key = "sub_admin_badges", cached = null;
        try { cached = JSON.parse(sessionStorage.getItem(key) || "null"); } catch (e) { }
        if (cached && Date.now() - cached.t < 45000) return paint(cached.v);
        var db = SUB.db, q = [];
        q.push(A.isMgr() || A.role() !== "Delivery Manager" ? db.collection("orders").where("status", "==", "Pending").get() : Promise.resolve(null));
        q.push(A.isMgr() ? db.collection("resellerApplications").where("status", "==", "Pending").get() : Promise.resolve(null));
        q.push(A.isMgr() ? db.collection("walletRequests").where("status", "==", "Pending").get() : Promise.resolve(null));
        q.push(A.isStaff() ? db.collection("products").get() : Promise.resolve(null));
        q.push(A.isMgr() ? db.collection("users").where("role", "==", "reseller").get() : Promise.resolve(null));
        q.push(A.isStaff() ? db.collection("reviews").where("status", "==", "pending").get() : Promise.resolve(null));
        Promise.all(q.map(function (p) { return p.catch(function () { return null; }); })).then(function (r) {
            SUB.settings("store").then(function (st) {
                var low = 0;
                if (r[3]) r[3].forEach(function (s) { var x = s.data(); if (x.active !== false && x.stock != null && x.stock <= SUB.num(st.lowStock)) low++; });
                var v = {
                    orders: r[0] ? r[0].size : null, "reseller-requests": r[1] ? r[1].size : null, "conversion-requests": r[2] ? r[2].size : null,
                    inventory: r[3] ? low : null, resellers: r[4] ? r[4].size : null, reviews: r[5] ? r[5].size : null, _low: low
                };
                try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: v })); } catch (e) { }
                paint(v);
            });
        });
        function paint(v) {
            A.counts = v;
            d.querySelectorAll(".nav[data-page]").forEach(function (a) {
                var pg = a.getAttribute("data-page"), b = a.querySelector(".badge");
                if (v[pg] == null) { if (b && ["orders", "inventory", "resellers", "reseller-requests", "conversion-requests", "reviews"].indexOf(pg) > -1) b.style.display = "none"; return; }
                if (!b) { b = d.createElement("b"); b.className = "badge"; a.appendChild(b); }
                b.textContent = v[pg]; b.style.display = v[pg] > 0 ? "" : "none";
            });
            var bell = d.querySelector(".top-actions .dot"), total = (v.orders || 0) + (v["reseller-requests"] || 0) + (v["conversion-requests"] || 0) + (v.reviews || 0);
            if (bell) bell.style.display = total > 0 ? "" : "none";
            var bb = bell && bell.parentNode;
            if (bb) bb.onclick = function () {
                A.toast(total ? [(v.orders || 0) + " pending orders", (v["reseller-requests"] || 0) + " reseller applications", (v["conversion-requests"] || 0) + " wallet requests", (v.reviews || 0) + " reviews to approve"].join(" · ") : "No new notifications");
            };
        }
    }
    A.refreshBadges = function () { try { sessionStorage.removeItem("sub_admin_badges"); } catch (e) { } if (booted) badges(); };

    function boot(profile) {
        A.me = profile;
        var allow = A.access[A.page];
        if (allow && allow.indexOf(profile.adminRole) < 0) {
            d.documentElement.style.visibility = "";
            var c = d.querySelector(".content");
            if (c) c.innerHTML = '<div class="a-note err"><b>Access restricted.</b> Your role (' + esc(profile.adminRole || "-") + ') cannot open this page.</div>';
            chrome();
            return;
        }
        chrome();
        booted = true;
        d.documentElement.style.visibility = "";
        queue.splice(0).forEach(function (fn) { try { fn(profile); } catch (e) { console.error(e); } });
    }

    if (A.page !== "login") {
        if (!SUB.configured) {
            d.addEventListener("DOMContentLoaded", function () {
                banner("<b>Firebase is not configured yet.</b> Open <code>assets/js/firebase-config.js</code> and paste your Firebase + Cloudinary keys. The pages below show static demo content until then.", "");
            });
        } else {
            d.documentElement.style.visibility = "hidden";
            SUB.onAuth(function (user, profile) {
                if (booted) { if (!user) location.replace("login.html"); return; }
                if (!user || !profile || profile.role !== "admin") {
                    location.replace("login.html" + (A.page !== "dashboard" ? "?next=" + encodeURIComponent(A.page + ".html") : ""));
                    return;
                }
                boot(profile);
            });
            // safety net: never leave the page hidden
            setTimeout(function () { d.documentElement.style.visibility = ""; }, 8000);
        }
    }
})(window, document);
