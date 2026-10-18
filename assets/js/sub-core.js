/* =========================================================
   SUBEESHA CORE  (window.SUB)
   Shared by the storefront, admin panel and reseller panel.
   Firebase (Auth + Firestore, compat SDK) + Cloudinary uploads.
   Pure JavaScript - no PHP / no server.
   ========================================================= */
(function (w, d) {
    "use strict";

    var SUB = w.SUB = { version: "1.0.0" };
    var FB = w.SUBEESHA_FIREBASE || {};
    var CLD = w.SUBEESHA_CLOUDINARY || {};

    SUB.configured = !!(w.firebase && FB.apiKey && FB.projectId &&
        !/YOUR_/i.test(String(FB.apiKey) + String(FB.projectId)));
    SUB.cloudConfigured = !!(CLD.cloudName && CLD.uploadPreset &&
        !/YOUR_/i.test(String(CLD.cloudName) + String(CLD.uploadPreset)));

    /* ---------- project root (works from /, /page/, /panel/admin/ ...) ---------- */
    SUB.root = "";
    (function () {
        var s = d.getElementsByTagName("script");
        for (var i = s.length - 1; i >= 0; i--) {
            var m = (s[i].getAttribute("src") || "").match(/^(.*?)assets\/js\/sub-core\.js/);
            if (m) { SUB.root = m[1]; return; }
        }
    })();
    SUB.url = function (p) { return SUB.root + p; };

    /* ---------- helpers ---------- */
    SUB.esc = function (v) {
        return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    };
    SUB.num = function (v) { var n = Number(v); return isFinite(n) ? n : 0; };
    SUB.money = function (n) { return "Rs. " + Math.round(SUB.num(n)).toLocaleString("en-US"); };
    SUB.toDate = function (t) {
        if (!t) return null;
        if (typeof t.toDate === "function") return t.toDate();
        if (t.seconds != null) return new Date(t.seconds * 1000);
        var x = new Date(t); return isNaN(x) ? null : x;
    };
    SUB.date = function (t) {
        var x = SUB.toDate(t); if (!x) return "-";
        return x.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };
    SUB.dateTime = function (t) {
        var x = SUB.toDate(t); if (!x) return "-";
        return SUB.date(x) + ", " + x.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    };
    SUB.slug = function (s) {
        return String(s || "").toLowerCase().trim().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    };
    SUB.qs = function (k) { return new URLSearchParams(w.location.search).get(k); };
    SUB.initials = function (n) {
        return String(n || "?").trim().split(/\s+/).map(function (x) { return x.charAt(0); }).join("").substring(0, 2).toUpperCase();
    };
    SUB.stars = function (n) {
        n = Math.round(SUB.num(n)); var s = "";
        for (var i = 1; i <= 5; i++) s += i <= n ? "\u2605" : "\u2606";
        return s;
    };
    SUB.emailKey = function (e) { return String(e || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "_"); };
    SUB.docs = function (snap) {
        var out = []; snap.forEach(function (s) { out.push(Object.assign({ id: s.id }, s.data())); }); return out;
    };
    SUB.ms = function (t) { var x = SUB.toDate(t); return x ? x.getTime() : 0; };

    /* ---------- notifications (each page registers its own toast) ---------- */
    SUB.notifyImpl = null;
    SUB.notify = function (msg, type, title) {
        type = type || "success";
        try { if (SUB.notifyImpl) return SUB.notifyImpl(msg, type, title); } catch (e) { }
        if (w.console) console.log("[" + type + "] " + msg);
    };

    /* ---------- Firebase init ---------- */
    var listeners = [];
    var readyResolve;
    SUB.ready = new Promise(function (r) { readyResolve = r; });
    SUB.user = null;
    SUB.profile = null;

    if (SUB.configured) {
        try {
            firebase.initializeApp(FB);
            SUB.auth = firebase.auth();
            SUB.db = firebase.firestore();
            SUB.FV = firebase.firestore.FieldValue;
        } catch (e) {
            console.error("Firebase init failed", e);
            SUB.configured = false;
        }
    }
    SUB.now = function () { return SUB.FV.serverTimestamp(); };
    SUB.col = function (n) { return SUB.db.collection(n); };

    SUB.loadProfile = function (u) {
        if (!u) return Promise.resolve(null);
        return SUB.db.collection("users").doc(u.uid).get().then(function (s) {
            return s.exists ? Object.assign({ id: u.uid }, s.data()) : null;
        }).catch(function (e) { console.warn("profile load failed", e); return null; });
    };
    function notifyAuth() { listeners.forEach(function (fn) { try { fn(SUB.user, SUB.profile); } catch (e) { console.error(e); } }); }
    SUB.refreshProfile = function () {
        return SUB.loadProfile(SUB.user).then(function (p) { SUB.profile = p; notifyAuth(); return p; });
    };
    SUB.onAuth = function (fn) {
        listeners.push(fn);
        SUB.ready.then(function () { fn(SUB.user, SUB.profile); });
    };
    SUB.isBlocked = function (p) { return !!p && (p.status === "blocked" || p.access === "Suspended"); };

    if (SUB.configured) {
        SUB.auth.onAuthStateChanged(function (u) {
            SUB.user = u;
            SUB.loadProfile(u).then(function (p) {
                if (u && SUB.isBlocked(p)) {
                    SUB.blocked = true;
                    SUB.auth.signOut();
                    return;
                }
                SUB.profile = p;
                readyResolve({ user: u, profile: p });
                notifyAuth();
            });
        });
    } else {
        readyResolve({ user: null, profile: null });
    }

    SUB.authError = function (e) {
        var m = {
            "auth/invalid-email": "Please enter a valid email address.",
            "auth/user-not-found": "No account found with this email.",
            "auth/wrong-password": "Incorrect email or password.",
            "auth/invalid-credential": "Incorrect email or password.",
            "auth/invalid-login-credentials": "Incorrect email or password.",
            "auth/email-already-in-use": "An account with this email already exists.",
            "auth/weak-password": "Password must be at least 6 characters.",
            "auth/too-many-requests": "Too many attempts. Please try again later.",
            "auth/network-request-failed": "Network error. Check your internet connection.",
            "auth/user-disabled": "This account has been disabled.",
            "permission-denied": "You do not have permission to do this."
        };
        return (e && m[e.code]) || (e && e.message) || "Something went wrong.";
    };

    SUB.signUp = function (o) {
        return SUB.auth.createUserWithEmailAndPassword(o.email, o.password).then(function (cred) {
            var p = {
                name: o.name, email: o.email, whatsapp: o.whatsapp || "", role: "customer",
                status: "active", access: "Allowed", points: 0, wallet: 0, walletUsed: 0,
                createdAt: SUB.now()
            };
            return SUB.db.collection("users").doc(cred.user.uid).set(p).then(function () {
                return SUB.refreshProfile();
            }).then(function () { return cred.user; });
        });
    };
    SUB.signIn = function (email, password) {
        SUB.blocked = false;
        return SUB.auth.signInWithEmailAndPassword(email, password).then(function (cred) {
            return SUB.loadProfile(cred.user).then(function (p) {
                if (!p) { return SUB.auth.signOut().then(function () { throw new Error("Account profile not found. Contact support."); }); }
                if (SUB.isBlocked(p)) {
                    return SUB.auth.signOut().then(function () { throw new Error("Your account has been blocked or suspended. Please contact support."); });
                }
                SUB.user = cred.user; SUB.profile = p;
                return p;
            });
        });
    };
    SUB.signOut = function () { return SUB.configured ? SUB.auth.signOut() : Promise.resolve(); };
    SUB.resetPassword = function (email) { return SUB.auth.sendPasswordResetEmail(email); };

    /* Create an Auth account WITHOUT signing the current (admin) user out */
    SUB.createAccount = function (email, password) {
        var name = "secondary-" + Date.now();
        var app2 = firebase.initializeApp(FB, name);
        return app2.auth().createUserWithEmailAndPassword(email, password).then(function (cred) {
            var uid = cred.user.uid;
            return app2.auth().signOut().then(function () { return app2.delete(); }).then(function () { return uid; });
        }).catch(function (e) { try { app2.delete(); } catch (x) { } throw e; });
    };
    SUB.randomPassword = function () {
        var chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789", out = "SUB@";
        var arr = new Uint32Array(8); (w.crypto || w.msCrypto).getRandomValues(arr);
        for (var i = 0; i < 8; i++) out += chars[arr[i] % chars.length];
        return out;
    };

    /* daily login reward (+10 points, limited once per ~day by Firestore rules) */
    SUB.dailyReward = function () {
        var p = SUB.profile; if (!p || p.role !== "customer" || !SUB.configured) return Promise.resolve(false);
        return SUB.settings("rewards").then(function (r) {
            var pts = SUB.num(r.dailyLogin);
            if (pts !== 10) return false;     // rules only allow the standard +10 self-award
            var last = SUB.ms(p.lastRewardAt);
            if (last && Date.now() - last < 20 * 3600 * 1000) return false;
            return SUB.db.collection("users").doc(p.id).update({
                points: SUB.FV.increment(10), lastRewardAt: SUB.now()
            }).then(function () {
                SUB.db.collection("rewardLog").add({ uid: p.id, points: 10, reason: "Daily Login", createdAt: SUB.now() }).catch(function () { });
                return SUB.refreshProfile().then(function () { return true; });
            }).catch(function () { return false; });
        }).catch(function () { return false; });
    };

    /* ---------- Cloudinary ---------- */
    SUB.cloud = {
        types: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/svg+xml", "image/bmp", "image/tiff"],
        maxMB: 10,
        accept: "image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml,image/bmp,image/tiff",
        valid: function (file, allowPdf) {
            if (!file) return "No file selected.";
            var ok = SUB.cloud.types.indexOf(file.type) > -1 || (allowPdf && file.type === "application/pdf");
            if (!ok) return "Unsupported file type: " + (file.type || file.name);
            if (file.size > SUB.cloud.maxMB * 1024 * 1024) return "File is larger than " + SUB.cloud.maxMB + " MB.";
            return "";
        },
        /* shrink very large photos before upload (saves data on slow connections) */
        shrink: function (file, max) {
            max = max || 1800;
            if (["image/jpeg", "image/png", "image/webp"].indexOf(file.type) < 0) return Promise.resolve(file);
            return new Promise(function (res) {
                var url = URL.createObjectURL(file), img = new Image();
                img.onload = function () {
                    URL.revokeObjectURL(url);
                    var s = Math.min(1, max / Math.max(img.width, img.height));
                    if (s >= 1) return res(file);
                    var c = d.createElement("canvas");
                    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
                    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
                    c.toBlob(function (b) { res(b || file); }, file.type, 0.9);
                };
                img.onerror = function () { URL.revokeObjectURL(url); res(file); };
                img.src = url;
            });
        },
        /* returns Promise<{url, publicId, width, height}> */
        upload: function (file, opt) {
            opt = opt || {};
            var err = SUB.cloud.valid(file, opt.allowPdf);
            if (err) return Promise.reject(new Error(err));
            if (!SUB.cloudConfigured) return Promise.reject(new Error("Cloudinary is not configured. Edit assets/js/firebase-config.js"));
            return SUB.cloud.shrink(file).then(function (blob) {
                return new Promise(function (res, rej) {
                    var fd = new FormData();
                    fd.append("file", blob, file.name);
                    fd.append("upload_preset", CLD.uploadPreset);
                    fd.append("folder", (CLD.folder || "subeesha") + (opt.folder ? "/" + opt.folder : ""));
                    var x = new XMLHttpRequest();
                    x.open("POST", "https://api.cloudinary.com/v1_1/" + CLD.cloudName + "/auto/upload");
                    x.upload.onprogress = function (e) { if (opt.onProgress && e.lengthComputable) opt.onProgress(e.loaded / e.total); };
                    x.onerror = function () { rej(new Error("Upload failed. Check your internet connection.")); };
                    x.onload = function () {
                        var j = {}; try { j = JSON.parse(x.responseText); } catch (e) { }
                        if (x.status >= 200 && x.status < 300 && j.secure_url) {
                            res({ url: j.secure_url, publicId: j.public_id, width: j.width, height: j.height });
                        } else {
                            rej(new Error((j.error && j.error.message) || "Cloudinary upload failed."));
                        }
                    };
                    x.send(fd);
                });
            });
        },
        uploadMany: function (files, opt) {
            var list = Array.prototype.slice.call(files || []);
            return list.reduce(function (p, f) {
                return p.then(function (acc) { return SUB.cloud.upload(f, opt).then(function (r) { acc.push(r.url); return acc; }); });
            }, Promise.resolve([]));
        }
    };
    /* optimised delivery URL for Cloudinary images (other URLs untouched) */
    SUB.img = function (url, width) {
        if (!url) return SUB.url("assets/images/logo.jpg");
        var m = String(url).match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/);
        if (m && !/\.svg$/i.test(url)) return m[1] + "f_auto,q_auto,c_limit,w_" + (width || 800) + "/" + m[2];
        return url;
    };

    /* ---------- settings ---------- */
    var DEFAULTS = {
        store: { name: "Subeesha", email: "info@subeesha.com", phone: "+92 300 0000000", currency: "PKR", lowStock: 10, address: "Office No. 12, Main Commercial Area, Latifabad, Hyderabad, Sindh, Pakistan" },
        shipping: { charge: 250, freeAbove: 5000, partner: "Default Courier" },
        payments: { cod: true, easypaisa: true, jazzcash: true, bank: true, online: false, easypaisaNumber: "", jazzcashNumber: "", bankDetails: "" },
        rewards: { conversion: 100, dailyLogin: 10, review: 50, firstOrder: 100, referral: 200, purchasePer100: 3, minConvert: 100 },
        flash: { active: false, name: "Flash Sale", discountPercent: 20, endsAt: null }
    };
    SUB.defaults = DEFAULTS;
    var settingsCache = {};
    SUB.settings = function (key, force) {
        if (!SUB.configured) return Promise.resolve(Object.assign({}, DEFAULTS[key]));
        if (settingsCache[key] && !force) return settingsCache[key];
        settingsCache[key] = SUB.db.collection("settings").doc(key).get().then(function (s) {
            return Object.assign({}, DEFAULTS[key], s.exists ? s.data() : {});
        }).catch(function () { return Object.assign({}, DEFAULTS[key]); });
        return settingsCache[key];
    };
    SUB.saveSettings = function (key, data) {
        delete settingsCache[key];
        return SUB.db.collection("settings").doc(key).set(Object.assign({}, data, { updatedAt: SUB.now() }), { merge: true });
    };

    /* ---------- catalog (products + categories + flash sale) ---------- */
    var catalogPromise = null;
    SUB.flashActive = function (f) {
        return !!(f && f.active && SUB.ms(f.endsAt) > Date.now());
    };
    SUB.decorate = function (p, flash) {
        var price = SUB.num(p.price), old = SUB.num(p.oldPrice);
        var cur = price;
        p._flash = false;
        if (p.inFlash && SUB.flashActive(flash)) {
            cur = SUB.num(p.flashPrice) > 0 ? SUB.num(p.flashPrice) : Math.round(price * (1 - SUB.num(flash.discountPercent) / 100));
            old = price; p._flash = true;
        }
        p._price = cur; p._old = old > cur ? old : 0;
        p._pct = p._old ? Math.round((1 - cur / p._old) * 100) : 0;
        p._img = (p.images && p.images[0]) || "";
        p._stock = p.stock == null ? 999 : SUB.num(p.stock);
        return p;
    };
    SUB.catalog = function (force) {
        if (catalogPromise && !force) return catalogPromise;
        if (!SUB.configured) return Promise.resolve({ products: [], categories: [], flash: DEFAULTS.flash, empty: true });
        catalogPromise = Promise.all([
            SUB.db.collection("products").where("active", "==", true).get(),
            SUB.db.collection("categories").get(),
            SUB.settings("flash")
        ]).then(function (r) {
            var flash = r[2];
            var products = SUB.docs(r[0]).map(function (p) { return SUB.decorate(p, flash); });
            products.sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); });
            var cats = SUB.docs(r[1]).sort(function (a, b) { return SUB.num(a.order) - SUB.num(b.order) || String(a.name).localeCompare(b.name); });
            return { products: products, categories: cats, flash: flash };
        }).catch(function (e) {
            console.error("Catalog load failed", e);
            catalogPromise = null;
            return { products: [], categories: [], flash: DEFAULTS.flash, error: e };
        });
        return catalogPromise;
    };
    SUB.getProduct = function (id) {
        return SUB.catalog().then(function (c) {
            var f = c.products.filter(function (p) { return p.id === id; })[0];
            if (f) return f;
            return SUB.db.collection("products").doc(id).get().then(function (s) {
                return s.exists ? SUB.decorate(Object.assign({ id: s.id }, s.data()), c.flash) : null;
            });
        });
    };
    SUB.categoryKey = function (p) { return SUB.slug(p.category || ""); };

    /* ---------- cart (localStorage) ---------- */
    var CART_KEY = "subeesha_cart_v1";
    SUB.cart = {
        get: function () { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } },
        save: function (items) { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) { } SUB.cart.render(); },
        count: function () { return SUB.cart.get().reduce(function (s, i) { return s + i.qty; }, 0); },
        total: function () { return SUB.cart.get().reduce(function (s, i) { return s + i.qty * SUB.num(i.price); }, 0); },
        add: function (item) {
            var items = SUB.cart.get();
            var f = items.filter(function (i) { return i.id === item.id && (i.color || "") === (item.color || "") && (i.size || "") === (item.size || ""); })[0];
            if (f) { f.qty = Math.min(10, f.qty + (item.qty || 1)); f.price = item.price; }
            else items.push({ id: item.id, name: item.name, price: item.price, image: item.image || "", qty: item.qty || 1, color: item.color || "", size: item.size || "" });
            SUB.cart.save(items);
        },
        setQty: function (idx, qty) {
            var items = SUB.cart.get(); if (!items[idx]) return;
            if (qty < 1) items.splice(idx, 1); else items[idx].qty = Math.min(10, qty);
            SUB.cart.save(items);
        },
        remove: function (idx) { var items = SUB.cart.get(); items.splice(idx, 1); SUB.cart.save(items); },
        clear: function () { SUB.cart.save([]); },
        render: function () {
            var n = SUB.cart.count();
            var els = d.querySelectorAll("#cartCount, .cart-count");
            for (var i = 0; i < els.length; i++) els[i].textContent = n;
        }
    };

    /* ---------- wishlist ---------- */
    var WISH_KEY = "subeesha_wish_v1";
    SUB.wish = {
        get: function () { try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; } catch (e) { return []; } },
        has: function (id) { return SUB.wish.get().indexOf(id) > -1; },
        save: function (list) {
            try { localStorage.setItem(WISH_KEY, JSON.stringify(list)); } catch (e) { }
            if (SUB.configured && SUB.user && SUB.profile) {
                SUB.db.collection("users").doc(SUB.user.uid).update({ wishlist: list }).catch(function () { });
                SUB.profile.wishlist = list;
            }
        },
        toggle: function (id) {
            var l = SUB.wish.get(), i = l.indexOf(id);
            if (i > -1) l.splice(i, 1); else l.push(id);
            SUB.wish.save(l); return i < 0;
        },
        sync: function (profile) {
            if (!profile) return;
            var merged = SUB.wish.get();
            (profile.wishlist || []).forEach(function (x) { if (merged.indexOf(x) < 0) merged.push(x); });
            try { localStorage.setItem(WISH_KEY, JSON.stringify(merged)); } catch (e) { }
        }
    };

    /* ---------- referral (reseller link ?ref=CODE) ---------- */
    (function () {
        var r = SUB.qs("ref");
        if (r) { try { localStorage.setItem("subeesha_ref", r.toUpperCase().slice(0, 30)); } catch (e) { } }
    })();
    SUB.refCode = function () { try { return localStorage.getItem("subeesha_ref") || ""; } catch (e) { return ""; } };

    /* ---------- coupons ---------- */
    SUB.checkCoupon = function (code, subtotal) {
        code = String(code || "").trim().toUpperCase();
        if (!code) return Promise.reject(new Error("Please enter a promo code."));
        return SUB.db.collection("discounts").doc(code).get().then(function (s) {
            if (!s.exists) throw new Error("Invalid promo code.");
            var c = s.data();
            if (!c.active) throw new Error("This promo code is not active.");
            if (c.expiresAt && SUB.ms(c.expiresAt) < Date.now()) throw new Error("This promo code has expired.");
            if (SUB.num(c.minOrder) > subtotal) throw new Error("Minimum order of " + SUB.money(c.minOrder) + " required for this code.");
            var amt = c.type === "fixed" ? SUB.num(c.value) : Math.round(subtotal * SUB.num(c.value) / 100);
            return { code: code, amount: Math.min(amt, subtotal), label: c.type === "fixed" ? SUB.money(c.value) + " off" : SUB.num(c.value) + "% off" };
        });
    };

    /* ---------- orders ---------- */
    SUB.shippingFor = function (subtotal, ship) {
        if (subtotal <= 0) return 0;
        return SUB.num(ship.freeAbove) > 0 && subtotal >= SUB.num(ship.freeAbove) ? 0 : SUB.num(ship.charge);
    };
    /*  o: { items:[{id,qty,color,size}], customer:{...}, paymentMethod, paymentRef, coupon, useWallet,
             source:'web'|'reseller'|'admin', resellerId? }  */
    SUB.placeOrder = function (o) {
        var user = SUB.user;
        if (!user) return Promise.reject(new Error("Please login to place your order."));
        var profile = SUB.profile || {};
        return Promise.all([SUB.catalog(true), SUB.settings("shipping", true)]).then(function (r) {
            var cat = r[0], ship = r[1];
            var lines = [], commission = 0;
            for (var i = 0; i < o.items.length; i++) {
                var it = o.items[i];
                var p = cat.products.filter(function (x) { return x.id === it.id; })[0];
                if (!p) throw new Error("A product in your order is no longer available.");
                var qty = Math.max(1, Math.min(10, Math.floor(SUB.num(it.qty) || 1)));
                if (p._stock < qty) throw new Error(p.name + " has only " + p._stock + " item(s) in stock.");
                var line = { id: p.id, name: p.name, price: p._price, qty: qty, image: p._img, color: it.color || "", size: it.size || "", sku: p.sku || "" };
                if (o.source === "reseller" || o.resellerCode) {
                    line.commissionPct = SUB.num(p.commission);
                    commission += Math.round(line.price * qty * line.commissionPct / 100);
                }
                lines.push(line);
            }
            var subtotal = lines.reduce(function (s, l) { return s + l.price * l.qty; }, 0);
            var shipping = SUB.shippingFor(subtotal, ship);
            var couponP = o.coupon ? SUB.checkCoupon(o.coupon, subtotal) : Promise.resolve(null);
            var resP = (o.resellerCode && !o.resellerId)
                ? SUB.db.collection("resellerCodes").doc(o.resellerCode).get().then(function (s) { return s.exists ? s.data().uid : null; }).catch(function () { return null; })
                : Promise.resolve(o.resellerId || null);
            return Promise.all([couponP, resP]).then(function (x) {
                var coupon = x[0], resellerId = x[1];
                if (resellerId === user.uid && o.source !== "reseller") resellerId = null;
                if (o.source === "admin" && !o.resellerCode) resellerId = null; // no self-referral
                if (!resellerId) commission = 0;
                var discount = coupon ? coupon.amount : 0;
                var walletUsed = 0;
                if (o.useWallet) walletUsed = Math.max(0, Math.min(SUB.num(profile.wallet), subtotal + shipping - discount));
                var total = Math.max(0, subtotal + shipping - discount - walletUsed);
                var order = {
                    userId: (o.source === "reseller" || o.source === "admin") ? null : user.uid,
                    customer: o.customer, items: lines,
                    subtotal: subtotal, shipping: shipping, discount: discount, couponCode: coupon ? coupon.code : "",
                    walletUsed: walletUsed, total: total,
                    paymentMethod: o.paymentMethod || "Cash on Delivery", paymentRef: o.paymentRef || "",
                    status: "Pending", source: o.source || "web",
                    resellerId: resellerId, commission: commission,
                    createdAt: SUB.now(), updatedAt: SUB.now()
                };
                var counter = SUB.db.collection("counters").doc("orders");
                return SUB.db.runTransaction(function (tx) {
                    return tx.get(counter).then(function (c) {
                        var n = c.exists ? c.data().n + 1 : 10001;
                        var no = "SUB-" + n;
                        order.orderNo = no;
                        tx.set(counter, { n: n });
                        tx.set(SUB.db.collection("orders").doc(no), order);
                        return no;
                    });
                }).then(function (no) { order.id = no; return order; });
            });
        });
    };

    /* ---------- misc ---------- */
    SUB.subscribeNewsletter = function (email) {
        if (!SUB.configured) return Promise.resolve();
        return SUB.db.collection("subscribers").doc(SUB.emailKey(email)).set({ email: String(email).trim().toLowerCase(), createdAt: SUB.now() });
    };
    SUB.countdown = function (endMs, cb) {
        function tick() {
            var dist = Math.max(0, endMs - Date.now());
            cb({
                days: Math.floor(dist / 864e5), hours: Math.floor(dist % 864e5 / 36e5),
                minutes: Math.floor(dist % 36e5 / 6e4), seconds: Math.floor(dist % 6e4 / 1e3), done: dist <= 0
            });
            return dist > 0;
        }
        tick();
        var t = setInterval(function () { if (!tick()) clearInterval(t); }, 1000);
        return t;
    };

    d.addEventListener("DOMContentLoaded", function () { SUB.cart.render(); });
    if (!SUB.configured && w.console) {
        console.warn("[Subeesha] Firebase is not configured yet - edit assets/js/firebase-config.js. Static demo content is shown.");
    }
})(window, document);
