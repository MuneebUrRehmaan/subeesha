/* =========================================================
   SUBEESHA STOREFRONT - Firebase data wiring
   Keeps the existing HTML/CSS design and fills it with live
   data from Firestore. If Firebase is not configured the
   original static demo content stays untouched.
   ========================================================= */
(function (w, d) {
    "use strict";
    if (!w.SUB) return;
    var page = d.body.getAttribute("data-page") || "";
    var esc = SUB.esc;

    /* ---------- notification adapters (each page has its own toast) ---------- */
    var cap = function (t) { return t === "error" ? "Error" : t === "warning" ? "Warning" : t === "info" ? "Info" : "Success"; };
    SUB.notifyImpl = function (msg, type, title) {
        if (typeof w.showToast !== "function") return;
        if (["index", "giveaway"].indexOf(page) > -1) return w.showToast(msg, type, title || cap(type));
        if (["billing", "profile", "loyalty"].indexOf(page) > -1) return w.showToast(title || cap(type), msg, type);
        if (page === "becomeseller") return w.showToast(msg, type, title || cap(type));
        return w.showToast(msg);
    };

    /* ---------- shared behaviour for every storefront page ---------- */
    function wireHeader() {
        SUB.onAuth(function (user, profile) {
            var links = d.querySelectorAll('a[href$="account.html"]');
            for (var i = 0; i < links.length; i++) {
                if (user && profile) {
                    links[i].setAttribute("href", SUB.url("page/profile.html"));
                    links[i].setAttribute("title", profile.name || "My account");
                } else {
                    links[i].setAttribute("href", SUB.url("account.html"));
                }
            }
            if (profile) SUB.wish.sync(profile);
        });
        // account buttons that were only a toast in the demo (flash sale page)
        var b = d.querySelectorAll('button[onclick*="Account page opened"]');
        for (var j = 0; j < b.length; j++) {
            b[j].setAttribute("onclick", "location.href=SUB.url('account.html')");
        }
        var wb = d.querySelectorAll('button[onclick*="Wishlist opened"], button[onclick*="wishlist is ready"]');
        for (var k = 0; k < wb.length; k++) {
            wb[k].setAttribute("onclick", "location.href=SUB.url('page/profile.html#wishlist')");
        }
    }
    wireHeader();

    /* addToCart / showCart for pages that do not load main.js */
    if (page !== "index" && page !== "giveaway") {
        w.addToCart = function (idOrName, price) {
            var p = (w.__products || []).filter(function (x) { return x.id === idOrName; })[0];
            if (p) {
                if (p._stock <= 0) return SUB.notify(p.name + " is out of stock.", "error", "Out of Stock");
                SUB.cart.add({ id: p.id, name: p.name, price: p._price, image: p._img, qty: 1 });
                return SUB.notify(p.name + " added to cart!", "success", "Added to Cart");
            }
            SUB.cart.add({ id: "demo-" + SUB.slug(idOrName), name: idOrName, price: Number(price) || 0, qty: 1 });
            SUB.notify(idOrName + " added to cart!", "success", "Added to Cart");
        };
        w.showCart = function () {
            if (!SUB.cart.count()) return SUB.notify("Your cart is empty.", "warning", "Cart");
            w.location.href = SUB.url("page/billing.html?cart=1");
        };
    }
    /* persist wishlist clicks of shop / flash cards */
    if (typeof w.toggleWishlist === "function") {
        var _tw = w.toggleWishlist;
        w.toggleWishlist = function (btn) {
            var c = btn.closest("[data-id]");
            if (c) SUB.wish.toggle(c.getAttribute("data-id"));
            _tw(btn);
        };
    }
    if (typeof w.subscribe === "function" && page !== "index") {
        w.subscribe = function (ev) {
            ev.preventDefault();
            var f = ev.target, email = (f.querySelector("input") || {}).value || "";
            var done = function () { SUB.notify("Thank you for subscribing to Subeesha!", "success", "Newsletter"); f.reset(); };
            if (SUB.configured) SUB.subscribeNewsletter(email).then(done).catch(done); else done();
        };
    }

    /* daily login reward */
    SUB.onAuth(function (user, profile) {
        if (!profile || profile.role !== "customer" || w.__rewardTried) return;
        w.__rewardTried = true;
        SUB.dailyReward().then(function (ok) { if (ok) SUB.notify("You earned +10 daily login points!", "success", "Rewards"); });
    });

    if (!SUB.configured) return;   // keep static demo content

    /* ---------- card templates ---------- */
    function ratingIon(n) {
        n = Math.round(n || 0); if (!n) return "";
        var s = ""; for (var i = 1; i <= 5; i++) s += i <= n ? "\u2605" : "\u2606";
        return '<div class="rating">' + s + "</div>";
    }
    function ratingFA(p) {
        var n = Math.round(p.rating || 0); if (!n) return "";
        var s = ""; for (var i = 1; i <= 5; i++) s += '<i class="fa-' + (i <= n ? "solid" : "regular") + ' fa-star"></i>';
        return '<div class="rating">' + s + (p.reviewCount ? "<span>(" + p.reviewCount + ")</span>" : "") + "</div>";
    }
    function badgeText(p, isNewList) {
        if (p.badge) return p.badge;
        if (p._flash && p._pct) return p._pct + "% OFF";
        if (p._pct) return p._pct + "% OFF";
        if (isNewList || p.isNew) return "NEW";
        return "";
    }
    function catLabel(p) { return esc(p.category || "General"); }
    function cardHome(p, isNewList) {
        var wished = SUB.wish.has(p.id), b = badgeText(p, isNewList);
        var soldOut = p._stock <= 0;
        return '<article class="card" data-id="' + esc(p.id) + '"><div class="card-img">' +
            '<img src="' + esc(SUB.img(p._img, 800)) + '" alt="' + esc(p.name) + '" loading="lazy">' +
            (soldOut ? '<span class="badge">SOLD OUT</span>' : (b ? '<span class="badge">' + esc(b) + "</span>" : "")) +
            '<button class="wish" onclick="toggleWish(this)" aria-label="Add to wishlist"><ion-icon name="' + (wished ? "heart" : "heart-outline") + '"' + (wished ? ' style="color:var(--pink)"' : "") + "></ion-icon></button>" +
            '<button class="quick-view" onclick="viewProduct(this)" aria-label="View product"><ion-icon name="eye-outline"></ion-icon></button></div>' +
            '<div class="card-body"><span class="product-cat">' + catLabel(p) + "</span><h3>" + esc(p.name) + "</h3>" + ratingIon(p.rating) +
            '<div class="price-row"><span class="price">' + SUB.money(p._price) + "</span>" + (p._old ? '<span class="old">' + SUB.money(p._old) + "</span>" : "") + "</div>" +
            '<button class="add-cart" onclick="addToCart(\'' + esc(p.id) + '\')"' + (soldOut ? " disabled" : "") + '><ion-icon name="bag-add-outline"></ion-icon> ' + (soldOut ? "Out of Stock" : "Add to Cart") + "</button></div></article>";
    }
    function cardShop(p, isNewList) {
        var wished = SUB.wish.has(p.id), b = badgeText(p, isNewList), soldOut = p._stock <= 0;
        return '<div class="product-card" data-id="' + esc(p.id) + '" data-category="' + esc(p.categorySlug || SUB.categoryKey(p)) + '">' +
            '<div class="product-image"><img src="' + esc(SUB.img(p._img, 700)) + '" alt="' + esc(p.name) + '" loading="lazy">' +
            (soldOut ? '<span class="product-badge">SOLD OUT</span>' : (b ? '<span class="product-badge">' + esc(b) + "</span>" : "")) +
            '<button class="wishlist-btn' + (wished ? " active" : "") + '" onclick="toggleWishlist(this)"><i class="fa-' + (wished ? "solid" : "regular") + ' fa-heart"></i></button></div>' +
            '<div class="product-info"><span class="product-category">' + catLabel(p) + "</span><h3>" + esc(p.name) + "</h3>" + ratingFA(p) +
            '<div class="price-row"><div><span class="price">' + SUB.money(p._price) + "</span>" + (p._old ? '<span class="old-price">' + SUB.money(p._old) + "</span>" : "") + "</div></div>" +
            '<div class="product-actions"><button class="add-cart" onclick="addToCart(\'' + esc(p.id) + '\')"' + (soldOut ? " disabled" : "") + ">" + (soldOut ? "Out of Stock" : "Add to Cart") + "</button>" +
            '<button class="quick-view" onclick="quickViewById(\'' + esc(p.id) + '\')"><i class="fa-regular fa-eye"></i></button></div></div></div>';
    }
    function cardFlash(p) {
        var wished = SUB.wish.has(p.id), soldOut = p._stock <= 0;
        var sold = SUB.num(p.sold), left = p._stock >= 999 ? 0 : p._stock;
        var pct = (sold + left) > 0 ? Math.min(100, Math.round(sold / (sold + left) * 100)) : 0;
        return '<div class="product-card" data-id="' + esc(p.id) + '" data-category="' + esc(p.categorySlug || SUB.categoryKey(p)) + '">' +
            '<div class="product-image"><img src="' + esc(SUB.img(p._img, 700)) + '" alt="' + esc(p.name) + '" loading="lazy">' +
            (p._pct ? '<span class="discount-badge">' + p._pct + "% OFF</span>" : "") +
            '<button class="wishlist-btn' + (wished ? " active" : "") + '" onclick="toggleWishlist(this)"><ion-icon name="' + (wished ? "heart" : "heart-outline") + '"></ion-icon></button></div>' +
            '<div class="product-info"><span class="product-category">' + catLabel(p) + "</span><h3>" + esc(p.name) + "</h3>" +
            '<div class="price-row"><span class="sale-price">' + SUB.money(p._price) + "</span>" + (p._old ? '<span class="old-price">' + SUB.money(p._old) + "</span>" : "") + "</div>" +
            (p._stock < 999 ? '<div class="stock-area"><div class="stock-text"><span>Sold: ' + sold + "</span><strong>" + (soldOut ? "Sold out" : "Only " + left + " left") + '</strong></div><div class="stock-bar"><div class="stock-progress" style="width:' + pct + '%"></div></div></div>' : "") +
            '<div class="product-actions"><button class="add-cart" onclick="addToCart(\'' + esc(p.id) + '\')"' + (soldOut ? " disabled" : "") + ">" + (soldOut ? "Sold Out" : "Add to Cart") + "</button>" +
            '<button class="view-btn" onclick="location.href=SUB.url(\'page/billing.html?product=' + encodeURIComponent(p.id) + '\')"><ion-icon name="eye-outline"></ion-icon></button></div></div></div>';
    }
    function empty(msg) {
        return '<p class="sub-empty" style="grid-column:1/-1;text-align:center;color:#68736e;padding:34px 10px;font-size:14px">' + esc(msg) + "</p>";
    }
    function loading(el) { if (el) el.innerHTML = empty("Loading..."); }

    /* shop-like filter buttons built from categories */
    function buildFilters(cats, handler) {
        var box = d.querySelector(".filter-buttons");
        if (!box) return;
        var html = '<button class="filter-btn active" onclick="' + handler + "('all',this)\">All</button>";
        cats.forEach(function (c) {
            html += '<button class="filter-btn" onclick="' + handler + "('" + esc(c.slug || SUB.slug(c.name)) + "',this)\">" + esc(c.name) + "</button>";
        });
        box.innerHTML = html;
    }
    function applyUrlFilters() {
        var cat = SUB.qs("category"), q = SUB.qs("search");
        if (cat) {
            var btns = d.querySelectorAll(".filter-btn");
            for (var i = 0; i < btns.length; i++) {
                if ((btns[i].getAttribute("onclick") || "").indexOf("'" + cat + "'") > -1) { btns[i].click(); break; }
            }
        }
        if (q) {
            var inp = d.getElementById("searchInput");
            if (inp) { inp.value = q; var fn = w.searchProducts || w.searchProduct; if (fn) fn(); }
        }
    }

    /* ======================================================
       HOME
       ====================================================== */
    function homePage() {
        var prodBoxes = d.querySelectorAll("#shop .products, #new .products");
        var featBox = prodBoxes[0], newBox = prodBoxes[1];
        loading(featBox); loading(newBox);

        SUB.catalog().then(function (c) {
            w.__products = c.products;
            // featured / new arrivals
            var feat = c.products.filter(function (p) { return p.featured; });
            if (!feat.length) feat = c.products.slice(0, 4);
            var neu = c.products.filter(function (p) { return p.isNew; });
            if (!neu.length) neu = c.products.slice(0, 4);
            if (featBox) featBox.innerHTML = feat.length ? feat.slice(0, 8).map(function (p) { return cardHome(p); }).join("") : empty("Products will appear here soon.");
            if (newBox) newBox.innerHTML = neu.length ? neu.slice(0, 8).map(function (p) { return cardHome(p, true); }).join("") : empty("New arrivals will appear here soon.");

            // categories
            var catBox = d.querySelector("#categories .categories");
            if (catBox) {
                if (c.categories.length) {
                    catBox.innerHTML = c.categories.slice(0, 6).map(function (k) {
                        return '<a href="' + SUB.url("page/shop.html?category=" + encodeURIComponent(k.slug || SUB.slug(k.name))) + '" class="category"><ion-icon name="' + esc(k.icon || "pricetag-outline") + '"></ion-icon><h3>' + esc(k.name) + "</h3><p>" + esc(k.tagline || "") + "</p></a>";
                    }).join("");
                } else { var sec = d.getElementById("categories"); if (sec) sec.style.display = "none"; }
            }

            // flash sale
            var sale = d.getElementById("sale");
            if (sale) {
                if (SUB.flashActive(c.flash)) {
                    var h2 = sale.querySelector(".sale-copy h2"), p = sale.querySelector(".sale-copy p");
                    if (h2) h2.textContent = c.flash.name || "Flash Sale";
                    if (p) p.textContent = "Save up to " + SUB.num(c.flash.discountPercent) + "% on selected products.";
                    if (typeof w.startFlashCountdown === "function") w.startFlashCountdown(SUB.ms(c.flash.endsAt));
                } else { sale.style.display = "none"; }
            }
        });

        // banners: hero + popup
        SUB.db.collection("banners").get().then(function (snap) {
            var all = SUB.docs(snap).filter(function (b) { return b.active !== false; })
                .sort(function (a, b) { return SUB.num(a.order) - SUB.num(b.order); });
            var heroes = all.filter(function (b) { return b.type === "hero"; });
            if (heroes.length) {
                var slides = d.querySelector(".hero-slider .slides");
                var dots = d.querySelector(".slider-dots");
                slides.innerHTML = heroes.map(function (b, i) {
                    var img = SUB.img(b.image, 2000);
                    return '<div class="hero-slide' + (i ? "" : " active") + '" style="background-image:linear-gradient(90deg,rgba(7,38,32,.94) 0%,rgba(14,61,52,.72) 43%,rgba(14,61,52,.12) 100%),url(\'' + esc(img).replace(/'/g, "%27") + '\');">' +
                        '<div class="hero-content">' + (b.tag ? '<span class="hero-tag"><ion-icon name="sparkles-outline"></ion-icon> ' + esc(b.tag) + "</span>" : "") +
                        "<h1>" + esc(b.title || "") + (b.titleEm ? "<br><em>" + esc(b.titleEm) + "</em>" : "") + "</h1>" +
                        (b.text ? "<p>" + esc(b.text) + "</p>" : "") + '<div class="hero-buttons">' +
                        (b.btn1Text ? '<a href="' + esc(b.btn1Link || "#shop") + '" class="btn btn-gold">' + esc(b.btn1Text) + ' <ion-icon name="arrow-forward-outline"></ion-icon></a>' : "") +
                        (b.btn2Text ? '<a href="' + esc(b.btn2Link || "#categories") + '" class="btn btn-light">' + esc(b.btn2Text) + "</a>" : "") + "</div></div></div>";
                }).join("");
                if (dots) dots.innerHTML = heroes.map(function (b, i) { return '<button class="dot' + (i ? "" : " active") + '" onclick="goToSlide(' + i + ')"></button>'; }).join("");
                var arrows = d.querySelectorAll(".slider-arrow");
                for (var i = 0; i < arrows.length; i++) arrows[i].style.display = heroes.length > 1 ? "" : "none";
                w.initHeroSlider();
            }
            var pop = all.filter(function (b) { return b.type === "popup"; })[0];
            if (pop) {
                var im = d.querySelector(".ad-image");
                if (im) {
                    if (pop.image) im.style.backgroundImage = "linear-gradient(90deg,rgba(14,61,52,.93),rgba(14,61,52,.20)),url('" + SUB.img(pop.image, 1000).replace(/'/g, "%27") + "')";
                    var sm = im.querySelector(".ad-small"), h = im.querySelector("h2"), pp = im.querySelector("p"), a = im.querySelector("a.btn");
                    if (sm && pop.small) sm.innerHTML = '<ion-icon name="flash-outline"></ion-icon> ' + esc(pop.small);
                    if (h) h.innerHTML = esc(pop.titlePre || "") + (pop.titleStrong ? " <strong>" + esc(pop.titleStrong) + "</strong>" : "");
                    if (pp) pp.textContent = pop.text || "";
                    if (a) { a.innerHTML = esc(pop.btnText || "Shop Now") + ' <ion-icon name="arrow-forward-outline"></ion-icon>'; a.setAttribute("href", pop.btnLink || "#shop"); }
                }
            } else { w.__adDisabled = true; }
        }).catch(function () { });

        // reviews carousel
        var track = d.getElementById("reviewTrack");
        if (track) {
            SUB.db.collection("reviews").where("status", "==", "approved").get().then(function (snap) {
                var rv = SUB.docs(snap).sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); }).slice(0, 8);
                var wrap = d.querySelector(".reviews-wrap");
                if (!rv.length) { if (wrap) wrap.style.display = "none"; return; }
                track.innerHTML = rv.map(function (r, i) {
                    return '<article class="review' + (i ? "" : " active") + '"><div class="review-top"><div class="stars">' + SUB.stars(r.rating) + '</div><span class="review-badge"><ion-icon name="checkmark-circle"></ion-icon> Verified</span></div>' +
                        '<p>"' + esc(r.review) + '"</p><div class="customer"><span class="customer-avatar">' + esc(SUB.initials(r.name)) + "</span><span><strong>" + esc(r.name) + "</strong><small>Verified Buyer</small></span></div></article>";
                }).join("");
                w.initReviewSlider();
            }).catch(function () { });
        }
    }

    /* ======================================================
       SHOP / NEW ARRIVALS / FLASH SALE / CATEGORIES
       ====================================================== */
    function listPage(kind) {
        var grid = d.getElementById("productsGrid") || d.querySelector(".products-grid");
        loading(grid);
        SUB.catalog().then(function (c) {
            w.__products = c.products;
            var list = c.products;
            if (kind === "new") {
                var n = list.filter(function (p) { return p.isNew; });
                list = n.length ? n : list.slice(0, 12);
            }
            if (kind === "flash") list = list.filter(function (p) { return p._flash; });
            if (kind !== "flash") buildFilters(c.categories, "filterProducts");
            else buildFilters(c.categories, "filterProducts");

            if (kind === "flash") {
                var bar = d.querySelector(".flash-sale-bar");
                if (!SUB.flashActive(c.flash)) {
                    if (bar) bar.style.display = "none";
                    if (grid) grid.innerHTML = empty("There is no active flash sale right now. Please check back soon!");
                    return;
                }
                if (typeof w.setSaleEnd === "function") w.setSaleEnd(SUB.ms(c.flash.endsAt));
                var inf = d.getElementById("sale-info");
                if (inf) { var s = inf.querySelector("h2, h3, strong"); if (s) s.textContent = c.flash.name || s.textContent; }
            }
            if (!grid) return;
            grid.innerHTML = list.length
                ? list.map(function (p) { return kind === "flash" ? cardFlash(p) : cardShop(p, kind === "new"); }).join("")
                : empty(kind === "flash" ? "Flash sale products will appear here soon." : "No products found.");
            applyUrlFilters();
        });
    }
    /* quick-view modal on the shop page uses the product id */
    w.quickViewById = function (id) {
        var p = (w.__products || []).filter(function (x) { return x.id === id; })[0];
        if (!p) return;
        w.__quickId = id;
        w.quickView(p.name, p.category || "", SUB.money(p._price), p.description || "", SUB.img(p._img, 700));
        var more = d.getElementById("modalMore");
        if (!more) {
            var btn = d.querySelector(".modal-cart-btn");
            if (btn) {
                more = d.createElement("a");
                more.id = "modalMore"; more.className = "modal-cart-btn";
                more.style.cssText = "display:block;text-align:center;margin-top:10px;background:transparent;color:inherit;border:1px solid currentColor;text-decoration:none";
                btn.parentNode.appendChild(more);
            }
        }
        if (more) { more.textContent = "Buy Now / Full Details"; more.setAttribute("href", SUB.url("page/billing.html?product=" + encodeURIComponent(id))); }
    };
    if (typeof w.addModalProductToCart === "function") {
        w.addModalProductToCart = function () {
            if (w.__quickId) { w.addToCart(w.__quickId); if (w.closeModal) w.closeModal(); }
        };
    }

    function categoriesPage() {
        var grid = d.getElementById("categoriesGrid");
        loading(grid);
        SUB.catalog().then(function (c) {
            if (!grid) return;
            if (!c.categories.length) { grid.innerHTML = empty("Categories will appear here soon."); return; }
            grid.innerHTML = c.categories.map(function (k) {
                var slug = k.slug || SUB.slug(k.name);
                return '<a href="' + SUB.url("page/shop.html?category=" + encodeURIComponent(slug)) + '" class="category-card" data-category="' + esc(k.group || "fashion") + '">' +
                    '<div class="category-image"><img src="' + esc(SUB.img(k.image, 700)) + '" alt="' + esc(k.name) + '" loading="lazy"><div class="category-icon"><ion-icon name="' + esc(k.icon || "pricetag-outline") + '"></ion-icon></div></div>' +
                    '<div class="category-info"><h3>' + esc(k.name) + "</h3><p>" + esc(k.tagline || "") + '</p><div class="category-link"><span>Explore Category</span><ion-icon name="arrow-forward-outline"></ion-icon></div></div></a>';
            }).join("");
        });
        // header search should jump to the shop
        w.searchProduct = function () {
            var q = (d.getElementById("searchInput") || {}).value || "";
            if (!q.trim()) return SUB.notify("Please enter a product name", "warning");
            w.location.href = SUB.url("page/shop.html?search=" + encodeURIComponent(q.trim()));
        };
    }

    /* the search box in header of shop pages only filters; other pages forward to shop */
    if (["new", "flash"].indexOf(page) > -1) { /* keep local search (filters cards on page) */ }

    if (page === "index") homePage();
    else if (page === "shop") listPage("shop");
    else if (page === "new-arrivals") listPage("new");
    else if (page === "flashsale") listPage("flash");
    else if (page === "categories") categoriesPage();
})(window, document);
