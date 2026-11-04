/* =========================================================
   SUBEESHA RESELLER CORE  (window.R)
   Auth guard + shared helpers for the reseller panel.
   ========================================================= */
(function (w, d) {
    "use strict";
    var R = w.R = {};
    R.me = null;
    var esc = SUB.esc;
    R.money = SUB.money;

    R.toast = function (m) { if (typeof w.showToast === "function") w.showToast(m); };
    SUB.notifyImpl = function (m) { R.toast(m); };
    R.err = function (e) {
        var m = (e && e.code === "permission-denied") ? "You do not have permission to do this." : (e && e.message) || "Something went wrong.";
        R.toast(m); if (w.console) console.error(e);
    };

    var queue = [], booted = false;
    R.ready = function (fn) { if (booted) fn(R.me); else queue.push(fn); };

    function chrome() {
        var p = R.me;
        var av = d.querySelector(".profile-mini .avatar"), nm = d.querySelector(".profile-info strong");
        if (av) av.textContent = SUB.initials(p.name);
        if (nm) nm.textContent = p.name || "Reseller";
        var h1 = d.querySelector(".top-left h1");
        if (h1 && !h1.getAttribute("data-page-title")) {
            var hr = new Date().getHours(), greet = hr < 12 ? "Good Morning" : hr < 17 ? "Good Afternoon" : "Good Evening";
            h1.textContent = greet + ", " + (p.name || "").split(" ")[0] + " \uD83D\uDC4B";
        }
        var lo = d.querySelector(".logout-btn");
        if (lo) lo.setAttribute("onclick", "R.logout()");
        var referral = location.origin + location.pathname.replace(/panel\/reseller\/.*/, "index.html") + "?ref=" + (p.resellerCode || "");
        w.copyReferralLink = function () {
            if (navigator.clipboard) navigator.clipboard.writeText(referral);
            R.toast("Your reseller referral link copied!");
        };
        w.shareProduct = function (name, id) {
            var link = location.origin + location.pathname.replace(/panel\/reseller\/.*/, "page/billing.html") + "?product=" + encodeURIComponent(id || "") + "&ref=" + (p.resellerCode || "");
            if (navigator.clipboard) navigator.clipboard.writeText(link);
            R.toast(name + " referral link copied!");
        };
    }
    R.logout = function () { SUB.signOut().then(function () { location.href = "login.html"; }); };

    function showAuthLoader() {
        if (d.getElementById("resellerPageLoader")) return;
        var loader = d.createElement("div");
        loader.id = "resellerPageLoader";
        loader.className = "reseller-page-loader";
        loader.setAttribute("role", "status");
        loader.setAttribute("aria-label", "Loading reseller panel");
        loader.innerHTML =
            '<aside class="auth-loader-sidebar"><div class="auth-loader-brand"><i></i><span></span></div>' +
            '<div class="auth-loader-nav"><i></i><i></i><i></i><i></i><i></i><i></i></div></aside>' +
            '<main class="auth-loader-main"><div class="auth-loader-top"><div><i></i><i></i></div><b></b></div>' +
            '<div class="auth-loader-content"><div class="auth-loader-title"><i></i><i></i></div>' +
            '<div class="auth-loader-stats"><i></i><i></i><i></i><i></i></div>' +
            '<div class="auth-loader-panels"><i></i><i></i></div></div></main>';
        d.body.appendChild(loader);
    }
    function removeAuthLoader() {
        var loader = d.getElementById("resellerPageLoader");
        if (loader) loader.remove();
    }
    function boot(profile) {
        R.me = profile; chrome(); booted = true;
        removeAuthLoader();
        queue.splice(0).forEach(function (fn) { try { fn(profile); } catch (e) { console.error(e); } });
    }
    function banner(msg) {
        var s = d.querySelector(".page-section.active") || d.querySelector(".page-section");
        if (!s) return;
        var n = d.createElement("div");
        n.style.cssText = "background:#fff6e4;border:1px solid #f0dcaa;color:#7a5a12;padding:12px 14px;border-radius:4px;font-size:12px;margin-bottom:14px;line-height:1.6";
        n.innerHTML = msg; s.insertBefore(n, s.firstChild);
    }
    if (!SUB.configured) {
        removeAuthLoader();
        booted = true;
        d.addEventListener("DOMContentLoaded", function () {
            banner("<b>Firebase is not configured yet.</b> Static demo content is shown until <code>assets/js/firebase-config.js</code> is set up.");
        });
    } else {
        showAuthLoader();
        SUB.onAuth(function (user, profile) {
            if (booted) { if (!user) location.replace("login.html"); return; }
            if (!user || !profile || profile.role !== "reseller") { location.replace("login.html"); return; }
            if (SUB.isBlocked(profile)) { SUB.signOut().then(function () { location.replace("login.html"); }); return; }
            boot(profile);
        });
        setTimeout(function () {
            var loader = d.getElementById("resellerPageLoader");
            if (loader) {
                var message = d.createElement("p");
                message.className = "auth-loader-message";
                message.textContent = "Connecting securely to your reseller account…";
                loader.appendChild(message);
            }
        }, 8000);
    }
})(window, document);
