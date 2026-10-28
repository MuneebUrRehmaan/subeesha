(function (w, d) {
  "use strict";
  var recentKey = "subeesha_recent_searches_v1", productCache = null;
  function esc(v) { return w.SUB ? SUB.esc(v) : String(v || "").replace(/[&<>"']/g, function (c) { return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]; }); }
  function readRecent() { try { return JSON.parse(localStorage.getItem(recentKey) || "[]").slice(0, 6); } catch (e) { return []; } }
  function saveRecent(q) { q = String(q || "").trim(); if (!q) return; var list = readRecent().filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); }); list.unshift(q); try { localStorage.setItem(recentKey, JSON.stringify(list.slice(0, 6))); } catch (e) {} }
  function searchUrl(q) { return SUB.url("page/shop.html?search=" + encodeURIComponent(q)); }
  function detailUrl(p) { return SUB.url("page/product.html?id=" + encodeURIComponent(p.id)); }
  function goSearch(q) { q = String(q || "").trim(); if (!q) return; saveRecent(q); w.location.href = searchUrl(q); }
  function products() {
    if (productCache) return Promise.resolve(productCache);
    if (w.__products && w.__products.length) { productCache = w.__products; return Promise.resolve(productCache); }
    if (w.SUB && SUB.configured) return SUB.catalog().then(function (c) { productCache = c.products || []; return productCache; }).catch(function () { return []; });
    return Promise.resolve([]);
  }
  function setupSearch(form) {
    if (form.dataset.siteSearchReady === "1") return;
    var input = form.querySelector('input[type="search"],input[type="text"]'); if (!input) return;
    form.dataset.siteSearchReady = "1";
    var trigger = form.querySelector(".site-search-toggle");
    if (!trigger) {
      trigger = d.createElement("button"); trigger.type = "button"; trigger.className = "site-search-toggle"; trigger.setAttribute("aria-label", "Open search"); trigger.innerHTML = '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>';
      form.insertBefore(trigger, form.firstChild);
    }
    var panel = d.createElement("div"); panel.className = "site-search-suggestions"; panel.hidden = true; panel.setAttribute("role", "listbox");
    form.appendChild(panel);
    function chooseRecent(q) { goSearch(q); }
    function render(q) {
      q = String(q || "").trim();
      var recent = readRecent();
      products().then(function (catalog) {
        // Do not overwrite a newer search while the catalog is loading.
        if (q !== input.value.trim()) return;
        var matches = q ? catalog.filter(function (p) { return p && p.name && p.active !== false && p.name.toLowerCase().indexOf(q.toLowerCase()) > -1; }).slice(0, 6) : [];
        var html = "";
        if (!q && recent.length) {
          html = '<div class="site-search-caption">Recent searches</div>' + recent.map(function (r) { return '<button type="button" data-recent="' + esc(r) + '"><span class="site-search-result-icon"><i class="fa-solid fa-clock-rotate-left"></i></span><span class="site-search-product"><strong>' + esc(r) + '</strong><small>Search again</small></span></button>'; }).join("");
        } else if (q && matches.length) {
          html = '<div class="site-search-caption">Matching products</div>' + matches.map(function (p) { return '<button type="button" data-product="' + esc(p.id) + '"><span class="site-search-result-icon"><i class="fa-solid fa-magnifying-glass"></i></span><span class="site-search-product"><strong>' + esc(p.name) + '</strong><small>' + esc(p.category || 'Collection') + '</small></span><span class="site-search-price">' + esc(SUB.money(p._price || p.price)) + '</span></button>'; }).join("");
        } else if (q) html = '<div class="site-search-caption">No matching product name</div>';
        if (q) html += '<button type="button" class="site-search-all" data-search-all="1">See all results for “' + esc(q) + '” <i class="fa-solid fa-arrow-right"></i></button>';
        panel.innerHTML = html;
        panel.hidden = !html;
      });
    }
    trigger.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); form.classList.toggle("site-search-open"); if (form.classList.contains("site-search-open")) { input.focus(); render(input.value); } else panel.hidden = true; });
    input.addEventListener("focus", function () { render(input.value); });
    input.addEventListener("input", function () { render(input.value); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); e.stopImmediatePropagation(); goSearch(input.value); } if (e.key === "Escape") { panel.hidden = true; form.classList.remove("site-search-open"); input.blur(); } });
    panel.addEventListener("click", function (e) {
      var btn = e.target.closest("button"); if (!btn) return;
      if (btn.hasAttribute("data-product")) { saveRecent(input.value); var pid = btn.getAttribute("data-product"); w.location.href = SUB.url("page/product.html?id=" + encodeURIComponent(pid) + (SUB.refCode && SUB.refCode() ? "&ref=" + encodeURIComponent(SUB.refCode()) : "")); }
      else if (btn.hasAttribute("data-recent")) chooseRecent(btn.getAttribute("data-recent"));
      else if (btn.hasAttribute("data-search-all")) goSearch(input.value);
    });
    // Capture searches before page-specific demo handlers so every page opens consistent results.
    form.addEventListener("submit", function (e) { e.preventDefault(); e.stopImmediatePropagation(); goSearch(input.value); }, true);
    form.querySelectorAll("button").forEach(function (btn) {
      if (btn === trigger) return;
      btn.addEventListener("click", function (e) { e.preventDefault(); e.stopImmediatePropagation(); goSearch(input.value); }, true);
    });
    d.addEventListener("click", function (e) { if (!form.contains(e.target)) panel.hidden = true; });
  }
  function loader() {
    var overlay = d.getElementById("siteLoader"); if (!overlay) return;
    var loaded = d.readyState === "complete" ? Promise.resolve() : new Promise(function (resolve) { w.addEventListener("load", resolve, { once: true }); });
    var data = w.SUB ? SUB.catalog().catch(function () {}) : Promise.resolve();
    var done = false; function hide() { if (done) return; done = true; overlay.classList.add("is-hidden"); w.setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 450); }
    Promise.all([loaded, data]).then(function () { w.setTimeout(hide, 450); });
    w.setTimeout(hide, 5000);
  }
  function checkoutSkeleton() {
    if (!d.body || d.body.getAttribute("data-page") !== "billing") return;
    var mask = d.createElement("div"); mask.className = "site-checkout-skeleton"; mask.id = "checkoutLoadingMask"; mask.setAttribute("aria-label", "Loading checkout");
    mask.innerHTML = '<div class="checkout-skel-card"><div class="skel-line title"></div><div class="skel-line medium"></div><div class="skel-line field"></div><div class="skel-line field"></div><div class="skel-line field"></div><div class="skel-line field"></div></div><div class="checkout-skel-card"><div class="skel-line title"></div><div class="skel-product"></div><div class="skel-product"></div><div class="skel-line medium"></div><div class="skel-line short"></div></div>';
    d.body.appendChild(mask);
    var task = w.SUB ? Promise.all([SUB.catalog(), SUB.settings("shipping"), SUB.settings("payments")]).catch(function () {}) : Promise.resolve();
    task.then(function () { w.setTimeout(function () { mask.hidden = true; }, 250); });
    w.setTimeout(function () { mask.hidden = true; }, 8000);
  }
  function init() {
    d.querySelectorAll("header .header-search, nav .header-search, .navbar .header-search").forEach(setupSearch);
    loader(); checkoutSkeleton();
    if (w.SUB && SUB.refCode) { /* keep existing referral capture from SUB core */ }
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(window, document);
