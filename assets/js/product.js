/* =========================================================
   SUBEESHA - PRODUCT DETAIL PAGE   (page/product.html?id=...)
   Images gallery, price, description, colour/size, quantity
   and Add to Cart. Everything comes from Firestore.
   ========================================================= */
(function (w, d) {
    "use strict";
    var root = d.getElementById("pdRoot"), esc = SUB.esc;

    /* header helpers (this page has no shop.js) */
    var tt;
    w.showToast = function (m) {
        var t = d.getElementById("toast"); d.getElementById("toastText").textContent = m;
        t.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("show"); }, 2600);
    };
    w.toggleMenu = function () { d.getElementById("navLinks").classList.toggle("show"); };
    w.searchProducts = function () {
        var q = (d.getElementById("searchInput").value || "").trim();
        if (!q) return w.showToast("Type a product name to search");
        w.location.href = "shop.html?search=" + encodeURIComponent(q);
    };
    w.subscribe = function (ev) {
        ev.preventDefault(); var f = ev.target, em = (f.querySelector("input") || {}).value || "";
        var done = function () { w.showToast("Thank you for subscribing to Subeesha!"); f.reset(); };
        if (SUB.configured) SUB.subscribeNewsletter(em).then(done).catch(done); else done();
    };

    function message(title, text) {
        root.innerHTML = '<div class="pd-empty"><h2>' + esc(title) + "</h2><p>" + esc(text) + '</p><a class="pd-add" href="shop.html" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none;max-width:240px;margin:0 auto">Continue Shopping</a></div>';
    }
    if (!SUB.configured) return message("Store not connected", "Firebase is not configured yet.");
    var id = SUB.qs("id");
    if (!id) return message("No product selected", "Please choose a product from the shop.");

    SUB.getProduct(id).then(function (p) {
        if (!p || p.active === false) return message("Product not found", "This product may have been removed.");
        render(p);
    }).catch(function () { message("Could not load this product", "Please check your connection and try again."); });

    /* related products (same category first, then others) */
    function loadRelated(p) {
        var box = d.createElement("section"); box.className = "pd-related";
        box.innerHTML = '<h2>You may also like</h2><div class="sc-grid" id="pdRel"></div>';
        root.querySelector(".pd").appendChild(box);
        var grid = d.getElementById("pdRel");
        function ui(fn) { if (w.SUBUI && w.SUBUI.card) fn(); else setTimeout(function () { ui(fn); }, 60); }
        ui(function () { grid.innerHTML = w.SUBUI.skCards(4); });
        SUB.catalog().then(function (c) {
            w.__products = c.products;
            var key = p.categorySlug || SUB.categoryKey(p);
            var same = c.products.filter(function (x) { return x.id !== p.id && (x.categorySlug || SUB.categoryKey(x)) === key; });
            var rest = c.products.filter(function (x) { return x.id !== p.id && same.indexOf(x) < 0; });
            var list = same.concat(rest).slice(0, 4);
            if (!list.length) { box.parentNode && box.parentNode.removeChild(box); return; }
            ui(function () { grid.innerHTML = list.map(function (x) { return w.SUBUI.card(x); }).join(""); });
        }).catch(function () { box.parentNode && box.parentNode.removeChild(box); });
    }

    function render(p) {
        var imgs = (p.images && p.images.length ? p.images : [""]).slice(), cur = 0, qty = 1;
        var sizes = p.sizes || [], colors = p.colors || [], size = "", color = "", colorIdx = -1;
        var stock = p._stock, maxQty = Math.max(1, Math.min(10, stock));
        var rate = Math.round(p.rating || 0);
        d.title = p.name + " | Subeesha";

        var stockHtml = stock <= 0 ? '<p class="pd-stock out">Out of stock</p>' : (stock <= 10 ? '<p class="pd-stock low">Only ' + stock + " left in stock</p>" : '<p class="pd-stock">In stock</p>');
        var thumbs = imgs.length > 1 ? '<div class="pd-thumbs">' + imgs.map(function (u, i) {
            return '<button class="pd-thumb' + (i === 0 ? " on" : "") + '" data-i="' + i + '" aria-label="Image ' + (i + 1) + '"><img src="' + esc(SUB.img(u, 200)) + '" alt=""></button>';
        }).join("") + "</div>" : "";
        var wished = SUB.wish.has(p.id);

        root.innerHTML = '<div class="pd">' +
            '<nav class="pd-crumbs"><a href="../index.html">Home</a><span>/</span><a href="shop.html">Shop</a><span>/</span>' +
            (p.category ? '<a href="shop.html?category=' + encodeURIComponent(p.categorySlug || SUB.slug(p.category)) + '">' + esc(p.category) + "</a><span>/</span>" : "") + "<span>" + esc(p.name) + "</span></nav>" +
            '<div class="pd-grid"><div class="pd-gallery' + (imgs.length > 1 ? "" : " single") + '">' + thumbs +
            '<div class="pd-main"><img id="pdMain" src="' + esc(SUB.img(imgs[0], 1000)) + '" alt="' + esc(p.name) + '" onerror="this.onerror=null;this.src=SUB.url(\'assets/images/logo.jpg\')"></div></div>' +
            '<div class="pd-info"><h1>' + esc(p.name) + "</h1>" +
            (rate ? '<div class="pd-rate">' + SUB.stars(rate) + (p.reviewCount ? "<small>(" + esc(p.reviewCount) + ")</small>" : "") + "</div>" : "") +
            '<div class="pd-price"><b>' + SUB.money(p._price) + "</b>" + (p._old ? "<s>" + SUB.money(p._old) + "</s><em>" + p._pct + "% OFF</em>" : "") + "</div>" +
            (p.description ? '<p class="pd-desc">' + esc(p.description) + "</p>" : "") + stockHtml +
            (colors.length ? '<p class="pd-label">Select Color</p><div class="pd-opts" id="pdColors">' + colors.map(function (c, i) { return '<button class="pd-opt" data-c="' + i + '">' + esc(c) + "</button>"; }).join("") + "</div>" : "") +
            (sizes.length ? '<p class="pd-label">Select Size</p><div class="pd-opts" id="pdSizes">' + sizes.map(function (z, i) { return '<button class="pd-opt" data-s="' + i + '">' + esc(z) + "</button>"; }).join("") + "</div>" : "") +
            '<p class="pd-label">Quantity</p><div class="pd-qty"><button id="pdMinus" aria-label="Decrease">&minus;</button><span id="pdQty">1</span><button id="pdPlus" aria-label="Increase">+</button></div>' +
            '<div class="pd-buy"><button class="pd-add" id="pdAdd"' + (stock <= 0 ? " disabled" : "") + ">" + (stock <= 0 ? "Out of Stock" : "Add to Cart") + "</button>" +
            '<button class="pd-fav' + (wished ? " on" : "") + '" id="pdFav" aria-label="Wishlist"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg></button></div>' +
            "</div></div></div>";

        loadRelated(p);
        var main = d.getElementById("pdMain");
        function show(i) {
            cur = i; main.src = SUB.img(imgs[i], 1000);
            [].forEach.call(root.querySelectorAll(".pd-thumb"), function (t) { t.classList.toggle("on", Number(t.getAttribute("data-i")) === i); });
        }
        function pick(group, attr, btn) {
            [].forEach.call(root.querySelectorAll(group + " .pd-opt"), function (b) { b.classList.toggle("on", b === btn); });
        }
        root.addEventListener("click", function (e) {
            var t = e.target.closest("button"); if (!t) return;
            if (t.classList.contains("pd-thumb")) return show(Number(t.getAttribute("data-i")));
            if (t.hasAttribute("data-c")) {
                colorIdx = Number(t.getAttribute("data-c")); color = colors[colorIdx]; pick("#pdColors", "c", t);
                if (imgs[colorIdx] && imgs.length > 1) show(colorIdx);   // colour n shows image n when it exists
                return;
            }
            if (t.hasAttribute("data-s")) { size = sizes[Number(t.getAttribute("data-s"))]; return pick("#pdSizes", "s", t); }
            if (t.id === "pdMinus") { qty = Math.max(1, qty - 1); d.getElementById("pdQty").textContent = qty; return; }
            if (t.id === "pdPlus") {
                if (qty >= maxQty) return SUB.notify(stock < 10 ? "Only " + stock + " item(s) in stock." : "Maximum 10 items per order.", "warning", "Quantity");
                qty++; d.getElementById("pdQty").textContent = qty; return;
            }
            if (t.id === "pdFav") { var on = SUB.wish.toggle(p.id); t.classList.toggle("on", on); return SUB.notify(on ? "Added to your wishlist." : "Removed from your wishlist.", on ? "success" : "warning", "Wishlist"); }
            if (t.id === "pdAdd") {
                if (colors.length && !color) return SUB.notify("Please select a color.", "warning", "Select Color");
                if (sizes.length && !size) return SUB.notify("Please select a size.", "warning", "Select Size");
                SUB.cart.add({ id: p.id, name: p.name, price: p._price, image: (colorIdx > -1 && imgs[colorIdx]) || imgs[cur] || imgs[0] || "", qty: qty, color: color, size: size });
                SUB.notify(p.name + " added to your cart.", "success", "Added to Cart");
                var old = t.textContent; t.textContent = "Added \u2713"; setTimeout(function () { t.textContent = old; }, 1400);
            }
        });
    }
})(window, document);
