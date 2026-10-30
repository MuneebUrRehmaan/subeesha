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

    /* ---------- ONE product card for every page ---------- */
    var IC = {
        bag: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
        eye: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
        heart: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>'
    };
    function badgeText(p, isNewList) {
        if (p.badge) return p.badge;
        if (p._pct) return p._pct + "% OFF";
        if (isNewList || p.isNew) return "NEW";
        return "";
    }
    function catLabel(p) { return esc(p.category || "General"); }
    function productUrl(id) { return SUB.url("page/product.html?id=" + encodeURIComponent(id)); }
    function card(p, isNewList) {
        var b = badgeText(p, isNewList), sold = p._stock <= 0, url = productUrl(p.id), wished = SUB.wish.has(p.id);
        var rate = Math.round(p.rating || 0);
        return '<article class="sc-card product-card" data-id="' + esc(p.id) + '" data-category="' + esc(p.categorySlug || SUB.categoryKey(p)) + '">' +
            '<a class="sc-media" href="' + url + '" aria-label="View ' + esc(p.name) + '"><img src="' + esc(SUB.img(p._img, 600)) + '" alt="' + esc(p.name) + '" loading="lazy" onload="this.classList.add(\'ld\')" onerror="this.onerror=null;this.src=SUB.url(\'assets/images/logo.jpg\');this.classList.add(\'ld\')">' +
            (sold ? '<span class="sc-badge sold">Sold out</span>' : (b ? '<span class="sc-badge">' + esc(b) + "</span>" : "")) + "</a>" +
            '<button class="sc-heart' + (wished ? " on" : "") + '" onclick="SUBUI.wish(this,\'' + esc(p.id) + '\')" aria-label="Add to wishlist">' + IC.heart + "</button>" +
            '<div class="sc-body"><span class="sc-cat">' + catLabel(p) + '</span><h3><a href="' + url + '">' + esc(p.name) + "</a></h3>" +
            (rate ? '<div class="sc-rate">' + SUB.stars(rate) + "</div>" : "") +
            '<div class="sc-price"><b>' + SUB.money(p._price) + "</b>" + (p._old ? "<s>" + SUB.money(p._old) + "</s>" : "") + "</div>" +
            '<div class="sc-actions"><button class="sc-bag" onclick="SUBUI.add(\'' + esc(p.id) + '\')" aria-label="Add to cart"' + (sold ? " disabled" : "") + ">" + IC.bag + '</button>' +
            '<a class="sc-view" href="' + url + '">' + IC.eye + " View</a></div></div></article>";
    }
    var cardHome = card, cardShop = card, cardFlash = card;

    w.SUBUI = {
        card: function (p, n) { return card(p, n); },
        skCards: function (n) { var o = ""; for (var i = 0; i < n; i++) o += skCard(); return o; },
        add: function (id) {
            var p = (w.__products || []).filter(function (x) { return x.id === id; })[0]; if (!p) return;
            if (p._stock <= 0) return SUB.notify(p.name + " is out of stock.", "error", "Out of Stock");
            // products with sizes/colours need a choice first -> open the detail page
            if ((p.sizes && p.sizes.length) || (p.colors && p.colors.length)) { w.location.href = productUrl(id); return; }
            SUB.cart.add({ id: p.id, name: p.name, price: p._price, image: p._img, qty: 1 });
            SUB.notify(p.name + " added to your cart.", "success", "Added to Cart");
        },
        wish: function (btn, id) {
            var on = SUB.wish.toggle(id);
            btn.classList.toggle("on", on);
            SUB.notify(on ? "Added to your wishlist." : "Removed from your wishlist.", on ? "success" : "warning", "Wishlist");
        }
    };

    /* ---------- skeleton (shimmer) loaders ---------- */
    function skCard() {
        return '<div class="sc-card"><div class="sc-media sk"></div><div class="sc-body"><div class="sk sk-line" style="width:40%"></div><div class="sk sk-line" style="width:88%;height:14px"></div><div class="sk sk-line" style="width:35%;height:16px;margin-bottom:14px"></div><div class="sc-actions"><div class="sk" style="width:42px;height:38px"></div><div class="sk" style="flex:1;height:38px"></div></div></div></div>';
    }
    function skBlocks(n, h) { var o = ""; for (var i = 0; i < n; i++) o += '<div class="sk" style="height:' + h + 'px"></div>'; return o; }
    function empty(msg) {
        return '<p class="sub-empty" style="grid-column:1/-1;text-align:center;color:#68736e;padding:34px 10px;font-size:14px">' + esc(msg) + "</p>";
    }
    function loading(el) {
        if (!el) return;
        el.classList.add("sc-grid");
        var o = ""; for (var i = 0; i < 8; i++) o += skCard();
        el.innerHTML = o;
    }

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
            var words = q.toLowerCase().split(/\s+/).filter(Boolean), n = 0;
            [].forEach.call(d.querySelectorAll(".product-card"), function (c) {
                var t = (((c.querySelector("h3") || {}).textContent || "") + " " + ((c.querySelector(".sc-cat") || {}).textContent || "")).toLowerCase();
                var ok = words.every(function (x) { return t.indexOf(x) > -1; });
                c.style.display = ok ? "" : "none"; if (ok) n++;
            });
            var grid = d.getElementById("productsGrid") || d.querySelector(".products-grid");
            if (grid) {
                var old = d.getElementById("scNote"); if (old) old.parentNode.removeChild(old);
                var note = d.createElement("div"); note.id = "scNote";
                note.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;background:#f7faf8;border:1px solid #e4ebe7;border-radius:4px;padding:12px 16px;margin-bottom:16px;font-size:14px";
                note.innerHTML = "<span>" + n + " result" + (n === 1 ? "" : "s") + " for <b>&ldquo;" + esc(q) + "&rdquo;</b></span><a href=\"shop.html\" style=\"color:#0e3d34;font-weight:600\">Clear search</a>";
                grid.parentNode.insertBefore(note, grid);
                if (!n) grid.insertAdjacentHTML("beforeend", empty("No products match your search. Try a different word."));
            }
        }
    }

    /* ======================================================
       HOME
       ====================================================== */
    function homePage() {
        var prodBoxes = d.querySelectorAll("#shop .products, #new .products");
        var featBox = prodBoxes[0], newBox = prodBoxes[1];
        loading(featBox); loading(newBox);
        var sale0 = d.getElementById("sale"); if (sale0) sale0.style.display = "none";
        var cat0 = d.querySelector("#categories .categories"); if (cat0) cat0.innerHTML = skBlocks(6, 150);
        var heroSk = null, hs = d.querySelector(".hero-slider");
        if (hs) { if (getComputedStyle(hs).position === "static") hs.style.position = "relative"; heroSk = d.createElement("div"); heroSk.className = "sk sk-hero"; hs.appendChild(heroSk); }
        function hideHeroSk() { if (heroSk && heroSk.parentNode) heroSk.parentNode.removeChild(heroSk); heroSk = null; }

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
                    sale.style.display = "";
                    var h2 = sale.querySelector(".sale-copy h2"), p = sale.querySelector(".sale-copy p");
                    if (h2) h2.textContent = c.flash.name || "Flash Sale";
                    if (p) p.textContent = "Save up to " + SUB.num(c.flash.discountPercent) + "% on selected products.";
                    if (typeof w.startFlashCountdown === "function") w.startFlashCountdown(SUB.ms(c.flash.endsAt));
                } else { sale.style.display = "none"; }
            }
        });

        // banners: hero + popup
        SUB.db.collection("banners").get().then(function (snap) {
            hideHeroSk();
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
        }).catch(function () { hideHeroSk(); });

        // reviews carousel
        var track = d.getElementById("reviewTrack");
        if (track) {
            try { reviewPaused = true; } catch (e) { }
            track.innerHTML = '<article class="review"><div class="sk" style="height:130px"></div></article><article class="review"><div class="sk" style="height:130px"></div></article><article class="review"><div class="sk" style="height:130px"></div></article>';
            SUB.db.collection("reviews").where("status", "==", "approved").get().then(function (snap) {
                var rv = SUB.docs(snap).sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); }).slice(0, 8);
                var wrap = d.querySelector(".reviews-wrap");
                if (!rv.length) { if (wrap) wrap.style.display = "none"; try { reviewPaused = false; } catch (e) { } return; }
                track.innerHTML = rv.map(function (r, i) {
                    return '<article class="review' + (i ? "" : " active") + '"><div class="review-top"><div class="stars">' + SUB.stars(r.rating) + '</div><span class="review-badge"><ion-icon name="checkmark-circle"></ion-icon> Verified</span></div>' +
                        '<p>"' + esc(r.review) + '"</p><div class="customer"><span class="customer-avatar">' + esc(SUB.initials(r.name)) + "</span><span><strong>" + esc(r.name) + "</strong><small>Verified Buyer</small></span></div></article>";
                }).join("");
                w.initReviewSlider();
                try { reviewPaused = false; } catch (e) { }
            }).catch(function () { try { reviewPaused = false; } catch (e) { } });
        }
    }

    /* ======================================================
       SHOP / NEW ARRIVALS / FLASH SALE / CATEGORIES
       ====================================================== */
    function listPage(kind) {
        var grid = d.getElementById("productsGrid") || d.querySelector(".products-grid");
        loading(grid);
        if (kind === "flash") { var bar0 = d.querySelector(".flash-sale-bar"); if (bar0) bar0.style.visibility = "hidden"; }
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
                if (bar) bar.style.visibility = "";
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
        if (grid) grid.innerHTML = skBlocks(8, 280);
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
