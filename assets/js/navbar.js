/* =========================================================
   SUBEESHA NAVBAR BEHAVIOUR
   cart count, account link, mobile menu, and search with
   recent searches + live product suggestions (Daraz style).
   ========================================================= */
(function (w, d) {
    "use strict";
    if (!w.SUB) return;
    function boot() {
    var $ = function (id) { return d.getElementById(id); }, esc = SUB.esc;
    var KEY = "subeesha_recent_search", MAX = 6;

    function recents() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
    function setRecents(l) { try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, MAX))); } catch (e) { } }
    function saveRecent(q) { setRecents([q].concat(recents().filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); }))); }
    function go(q) {
        q = String(q || "").trim(); if (!q) return;
        saveRecent(q); w.location.href = SUB.url("page/shop.html?search=" + encodeURIComponent(q));
    }

    /* ----- matching ----- */
    var catPromise = null;
    function catalog() {
        if (!SUB.configured) return Promise.resolve({ products: [], categories: [] });
        return catPromise || (catPromise = SUB.catalog());
    }
    function hl(text, q) {
        var i = text.toLowerCase().indexOf(q.toLowerCase());
        if (i < 0) return esc(text);
        return esc(text.slice(0, i)) + "<b>" + esc(text.slice(i, i + q.length)) + "</b>" + esc(text.slice(i + q.length));
    }
    function match(c, q) {
        var ql = q.toLowerCase(), words = ql.split(/\s+/).filter(Boolean);
        var prods = (c.products || []).filter(function (p) {
            var t = (p.name + " " + (p.category || "")).toLowerCase();
            return words.every(function (x) { return t.indexOf(x) > -1; });
        }).sort(function (a, b) {
            var ai = a.name.toLowerCase().indexOf(ql), bi = b.name.toLowerCase().indexOf(ql);
            return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
        }).slice(0, 7);
        var cats = (c.categories || []).filter(function (k) { return k.name.toLowerCase().indexOf(ql) > -1; }).slice(0, 2);
        return { prods: prods, cats: cats };
    }
    var token = 0;
    function render(box, q) {
        var my = ++token; q = (q || "").trim();
        if (!q) {
            var r = recents();
            box.innerHTML = r.length ? '<div class="sb-sh"><span>Recent searches</span><button type="button" data-clear="1">Clear all</button></div>' +
                r.map(function (x) { return '<div class="sb-row"><button type="button" class="sb-sg" data-q="' + esc(x) + '"><ion-icon name="time-outline"></ion-icon><span>' + esc(x) + '</span></button><button type="button" class="sb-x" data-rm="' + esc(x) + '" aria-label="Remove">&times;</button></div>'; }).join("") : "";
            return Promise.resolve(!!r.length);
        }
        return catalog().then(function (c) {
            if (my !== token) return false;
            var m = match(c, q), h = "";
            m.cats.forEach(function (k) { h += '<div class="sb-row"><button type="button" class="sb-sg" data-cat="' + esc(k.slug || SUB.slug(k.name)) + '"><ion-icon name="grid-outline"></ion-icon><span>' + hl(k.name, q) + '</span><em>in Categories</em></button></div>'; });
            m.prods.forEach(function (p) { h += '<div class="sb-row"><button type="button" class="sb-sg" data-q="' + esc(p.name) + '"><ion-icon name="search-outline"></ion-icon><span>' + hl(p.name, q) + '</span><em>' + esc(p.category || "") + '</em></button></div>'; });
            if (!h) h = '<div class="sb-none">No suggestions. Press Enter to search for &ldquo;' + esc(q) + '&rdquo;.</div>';
            box.innerHTML = h; return true;
        });
    }
    function bind(box, close) {
        box.addEventListener("mousedown", function (e) { e.preventDefault(); });
        box.addEventListener("click", function (e) {
            var t = e.target.closest("[data-q],[data-cat],[data-rm],[data-clear]"); if (!t) return;
            if (t.hasAttribute("data-q")) return go(t.getAttribute("data-q"));
            if (t.hasAttribute("data-cat")) { w.location.href = SUB.url("page/shop.html?category=" + encodeURIComponent(t.getAttribute("data-cat"))); return; }
            if (t.hasAttribute("data-rm")) { var v = t.getAttribute("data-rm"); setRecents(recents().filter(function (x) { return x !== v; })); return render(box, "").then(function (any) { if (!any) close(); }); }
            if (t.hasAttribute("data-clear")) { setRecents([]); box.innerHTML = ""; close(); }
        });
    }
    function keynav(input, box) {
        input.addEventListener("keydown", function (e) {
            var items = [].slice.call(box.querySelectorAll(".sb-sg")); if (!items.length) return;
            var cur = items.findIndex(function (i) { return i.classList.contains("act"); });
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault(); items.forEach(function (i) { i.classList.remove("act"); });
                cur = e.key === "ArrowDown" ? (cur + 1) % items.length : (cur <= 0 ? items.length - 1 : cur - 1);
                items[cur].classList.add("act"); items[cur].scrollIntoView({ block: "nearest" });
            } else if (e.key === "Enter" && cur > -1) { e.preventDefault(); items[cur].click(); }
        });
    }

    /* ----- desktop dropdown ----- */
    var form = $("sbSearch"), input = $("sbInput"), box = $("sbSuggest");
    if (form && input && box) {
        var open = function () { render(box, input.value).then(function (any) { box.classList.toggle("open", !!any); }); };
        var close = function () { box.classList.remove("open"); };
        input.addEventListener("focus", open);
        input.addEventListener("input", open);
        input.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
        d.addEventListener("click", function (e) { if (!e.target.closest(".sb-sw")) close(); });
        form.addEventListener("submit", function (e) { e.preventDefault(); go(input.value); });
        bind(box, close); keynav(input, box);
    }

    /* ----- mobile overlay ----- */
    var ov = $("sbMSearch"), mform = $("sbMForm"), minput = $("sbMInput"), mlist = $("sbMList");
    if (ov && mform) {
        var mopen = function () { ov.classList.add("open"); d.body.style.overflow = "hidden"; render(mlist, minput.value); setTimeout(function () { minput.focus(); }, 60); };
        var mclose = function () { ov.classList.remove("open"); d.body.style.overflow = ""; };
        $("sbSToggle").addEventListener("click", mopen);
        $("sbMBack").addEventListener("click", mclose);
        minput.addEventListener("input", function () { render(mlist, minput.value); });
        mform.addEventListener("submit", function (e) { e.preventDefault(); go(minput.value); });
        bind(mlist, function () { }); keynav(minput, mlist);
        d.addEventListener("keydown", function (e) { if (e.key === "Escape") mclose(); });
    }
    var sp = SUB.qs("search");
    if (sp) { if (input) input.value = sp; if (minput) minput.value = sp; }

    /* ----- menu, cart, account, active link ----- */
    var links = $("navLinks"), menu = $("sbMenu");
    w.toggleMenu = function () { if (links) links.classList.toggle("active"); };
    if (menu) menu.addEventListener("click", w.toggleMenu);
    if (links) links.addEventListener("click", function (e) {
        var trigger = e.target.closest(".sb-nav-trigger");
        if (trigger) {
            e.preventDefault();
            var parent = trigger.closest(".sb-has-submenu");
            var nextOpen = !parent.classList.contains("open");
            [].forEach.call(links.querySelectorAll(".sb-has-submenu.open"), function (item) {
                item.classList.remove("open");
                var btn = item.querySelector(".sb-nav-trigger");
                if (btn) btn.setAttribute("aria-expanded", "false");
            });
            if (nextOpen) parent.classList.add("open");
            trigger.setAttribute("aria-expanded", nextOpen ? "true" : "false");
            return;
        }
        if (e.target.closest("a")) {
            links.classList.remove("active");
            [].forEach.call(links.querySelectorAll(".sb-has-submenu.open"), function (item) {
                item.classList.remove("open");
                var btn = item.querySelector(".sb-nav-trigger");
                if (btn) btn.setAttribute("aria-expanded", "false");
            });
        }
    });
    d.addEventListener("click", function (e) {
        if (!e.target.closest(".sb-has-submenu") && links) {
            [].forEach.call(links.querySelectorAll(".sb-has-submenu.open"), function (item) {
                item.classList.remove("open");
                var btn = item.querySelector(".sb-nav-trigger");
                if (btn) btn.setAttribute("aria-expanded", "false");
            });
        }
    });
    var cart = $("sbCart");
    if (cart) cart.addEventListener("click", function () {
        if (!SUB.cart.count()) return SUB.notify("Your cart is empty.", "warning", "Cart");
        w.location.href = SUB.url("page/billing.html?cart=1");
    });
    var here = (w.location.pathname.split("/").pop() || "index.html").toLowerCase();
    [].forEach.call(d.querySelectorAll(".sb-links a"), function (a) {
        var f = (a.getAttribute("href").split("#")[0].split("/").pop() || "").toLowerCase();
        if (f && f === here && a.getAttribute("href").indexOf("#") < 0) a.classList.add("on");
    });
    [].forEach.call(d.querySelectorAll(".sb-has-submenu"), function (item) {
        if (item.querySelector(".sb-submenu a.on")) {
            var trigger = item.querySelector(".sb-nav-trigger");
            if (trigger) trigger.classList.add("on");
        }
    });
    var reminderCheckUid = null;
    function maybeShowReviewReminder(user, profile) {
        if (!user || !profile || profile.role !== "customer" || !SUB.configured) return;
        if ((w.location.pathname.split("/").pop() || "").toLowerCase() === "customer-love.html") return;
        // SUB.onAuth may notify once from the auth listener and once from SUB.ready.
        // Keep a single reminder lookup per signed-in user to avoid duplicate cards.
        if (reminderCheckUid === user.uid) return;
        reminderCheckUid = user.uid;
        var promptKey = "subeesha_review_prompted_" + user.uid;
        try { if (w.sessionStorage.getItem(promptKey)) return; } catch (e) { }

        Promise.all([
            SUB.db.collection("orders").where("userId", "==", user.uid).get(),
            SUB.db.collection("reviews").where("uid", "==", user.uid).get()
        ]).then(function (results) {
            var orders = SUB.docs(results[0]).filter(function (o) { return o.status === "Delivered"; });
            var reviewed = {};
            SUB.docs(results[1]).forEach(function (r) {
                if (r.orderId && r.productId) reviewed[r.orderId + "__" + r.productId] = true;
            });
            var candidate = null;
            orders.some(function (order) {
                return (order.items || []).some(function (item) {
                    if (!item.id || reviewed[order.id + "__" + item.id]) return false;
                    candidate = { order: order, item: item };
                    return true;
                });
            });
            if (!candidate) return;

            try { w.sessionStorage.setItem(promptKey, "1"); } catch (e) { }
            var order = candidate.order, item = candidate.item;
            var notice = d.createElement("aside");
            notice.className = "sb-review-reminder";
            notice.setAttribute("role", "status");
            notice.innerHTML = '<div class="sb-review-reminder__icon"><ion-icon name="star-outline"></ion-icon></div>' +
                '<div class="sb-review-reminder__content"><strong>Your order has been delivered!</strong><p>' +
                esc(item.name || "Your product") + ' from order #' + esc(order.orderNo || order.id) + ' is ready for your review.</p>' +
                '<a href="' + SUB.url("page/customer-love.html?order=" + encodeURIComponent(order.id) + "&product=" + encodeURIComponent(item.id)) + '">Write a review <ion-icon name="arrow-forward-outline"></ion-icon></a></div>' +
                '<button class="sb-review-reminder__close" type="button" aria-label="Dismiss"><ion-icon name="close-outline"></ion-icon></button>';
            d.body.appendChild(notice);
            var timer = w.setTimeout(function () { if (notice.parentNode) notice.parentNode.removeChild(notice); }, 30000);
            notice.querySelector(".sb-review-reminder__close").addEventListener("click", function () {
                w.clearTimeout(timer);
                if (notice.parentNode) notice.parentNode.removeChild(notice);
            });
        }).catch(function (e) {
            if (reminderCheckUid === user.uid) reminderCheckUid = null;
            if (w.console) console.warn("Review reminder not available", e);
        });
    }

    var reminderUid = null;
    SUB.onAuth(function (user, profile) {
        if (!user && reminderUid) {
            try { w.sessionStorage.removeItem("subeesha_review_prompted_" + reminderUid); } catch (e) { }
            reminderUid = null;
            reminderCheckUid = null;
        }
        if (user) reminderUid = user.uid;
        var u = $("sbUser");
        if (u) {
            u.setAttribute("href", user && profile ? SUB.url("page/profile.html") : SUB.url("account.html"));
            u.setAttribute("title", user && profile ? (profile.name || "My account") : "Login / Sign up");
        }
        maybeShowReviewReminder(user, profile);
    });
    SUB.cart.render();
    }
    if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})(window, document);
