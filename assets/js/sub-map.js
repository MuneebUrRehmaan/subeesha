/* =========================================================
   SUBEESHA MAP  (Leaflet + OpenStreetMap, no API key)
   SUB.map.pick({lat,lng}) -> Promise<{lat,lng,address,city,province}|null>
   SUB.map.load()  lazy-loads Leaflet for custom maps (admin zones)
   ========================================================= */
(function (w, d) {
    "use strict";
    if (!w.SUB) return;
    var BASE = "https://unpkg.com/leaflet@1.9.4/dist/", loading = null, styled = false;

    var map = SUB.map = {
        load: function () {
            if (w.L) return Promise.resolve(w.L);
            if (loading) return loading;
            loading = new Promise(function (res, rej) {
                var l = d.createElement("link"); l.rel = "stylesheet"; l.href = BASE + "leaflet.css"; d.head.appendChild(l);
                var s = d.createElement("script"); s.src = BASE + "leaflet.js";
                s.onload = function () { res(w.L); };
                s.onerror = function () { loading = null; rej(new Error("Could not load the map. Please check your internet connection.")); };
                d.head.appendChild(s);
            });
            return loading;
        },
        tiles: function (L, m) {
            L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(m);
        },
        search: function (q) {
            return fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=pk&q=" + encodeURIComponent(q))
                .then(function (r) { return r.json(); })
                .then(function (l) { return l.map(function (x) { return { lat: Number(x.lat), lng: Number(x.lon), name: x.display_name }; }); });
        },
        reverse: function (lat, lng) {
            return fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&addressdetails=1&lat=" + lat + "&lon=" + lng)
                .then(function (r) { return r.json(); })
                .then(function (x) {
                    var a = x.address || {};
                    return { lat: lat, lng: lng, address: x.display_name || "", city: a.city || a.town || a.village || a.county || a.state_district || "", province: a.state || "" };
                }).catch(function () { return { lat: lat, lng: lng, address: "", city: "", province: "" }; });
        },
        geocodeCity: function (name) {
            if (!name) return Promise.resolve(null);
            return map.search(name + ", Pakistan").then(function (r) { return r[0] || null; }).catch(function () { return null; });
        },
        pick: function (opt) {
            opt = opt || {};
            injectStyle();
            return map.load().then(function (L) {
                return new Promise(function (resolve) {
                    var bg = d.createElement("div"); bg.className = "sm-bg";
                    bg.innerHTML = '<div class="sm-box" role="dialog" aria-label="Select location"><div class="sm-head"><input id="smQ" type="search" placeholder="Search area or city..." autocomplete="off"><button type="button" id="smGo">Search</button><button type="button" class="alt" id="smMe">My location</button></div>' +
                        '<div class="sm-res" id="smRes" style="display:none"></div><div class="sm-map" id="smMap"></div>' +
                        '<div class="sm-foot"><div class="sm-addr" id="smAddr">Tap on the map or drag the pin to set your location.</div><div style="display:flex;gap:8px"><button type="button" class="alt" id="smCancel">Cancel</button><button type="button" id="smOk" disabled>Confirm location</button></div></div></div>';
                    d.body.appendChild(bg); d.body.style.overflow = "hidden";
                    var q = bg.querySelector("#smQ"), res = bg.querySelector("#smRes"), addr = bg.querySelector("#smAddr"), ok = bg.querySelector("#smOk");
                    var has = opt.lat != null && opt.lng != null && isFinite(opt.lat) && isFinite(opt.lng);
                    var m = L.map(bg.querySelector("#smMap")).setView(has ? [opt.lat, opt.lng] : [27.5, 68.5], has ? 15 : 6);
                    map.tiles(L, m);
                    var pin = null, cur = null, seq = 0;
                    function setPin(lat, lng, zoom) {
                        if (!pin) {
                            pin = L.marker([lat, lng], { draggable: true }).addTo(m);
                            pin.on("dragend", function () { var p = pin.getLatLng(); setPin(p.lat, p.lng); });
                        } else pin.setLatLng([lat, lng]);
                        if (zoom) m.setView([lat, lng], zoom);
                        var my = ++seq; ok.disabled = true; addr.textContent = "Finding address...";
                        map.reverse(lat, lng).then(function (r) { if (my !== seq) return; cur = r; addr.textContent = r.address || (lat.toFixed(5) + ", " + lng.toFixed(5)); ok.disabled = false; });
                    }
                    m.on("click", function (e) { setPin(e.latlng.lat, e.latlng.lng); });
                    if (has) setPin(opt.lat, opt.lng);
                    setTimeout(function () { m.invalidateSize(); }, 80);
                    function close(v) { bg.remove(); d.body.style.overflow = ""; resolve(v); }
                    function doSearch() {
                        var t = q.value.trim(); if (!t) return;
                        res.style.display = "block"; res.innerHTML = '<div>Searching...</div>';
                        map.search(t).then(function (list) {
                            res.innerHTML = list.length ? list.map(function (x, i) { return '<div data-i="' + i + '">' + SUB.esc(x.name) + "</div>"; }).join("") : "<div>No results found.</div>";
                            res._list = list;
                        }).catch(function () { res.innerHTML = "<div>Search failed. Try again.</div>"; });
                    }
                    bg.querySelector("#smGo").onclick = doSearch;
                    q.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doSearch(); } });
                    res.addEventListener("click", function (e) {
                        var t = e.target.closest("[data-i]"); if (!t || !res._list) return;
                        var x = res._list[Number(t.getAttribute("data-i"))]; res.style.display = "none"; setPin(x.lat, x.lng, 16);
                    });
                    bg.querySelector("#smMe").onclick = function () {
                        if (!navigator.geolocation) return alert("Your browser does not support location.");
                        addr.textContent = "Getting your location...";
                        navigator.geolocation.getCurrentPosition(function (p) { setPin(p.coords.latitude, p.coords.longitude, 17); },
                            function () { addr.textContent = "Could not get your location. Please allow location access or tap on the map."; }, { enableHighAccuracy: true, timeout: 12000 });
                    };
                    bg.querySelector("#smCancel").onclick = function () { close(null); };
                    bg.addEventListener("mousedown", function (e) { if (e.target === bg) close(null); });
                    ok.onclick = function () { if (cur) close(cur); };
                });
            });
        }
    };

    function injectStyle() {
        if (styled) return; styled = true;
        var s = d.createElement("style");
        s.textContent = ".sm-bg{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:6000;display:flex;align-items:center;justify-content:center;padding:14px;font-family:Arial,sans-serif}" +
            ".sm-box{background:#fff;border-radius:4px;width:100%;max-width:720px;max-height:94vh;overflow:hidden;display:flex;flex-direction:column}" +
            ".sm-head{display:flex;gap:8px;padding:12px;border-bottom:1px solid #e4ebe7;flex-wrap:wrap}" +
            ".sm-head input{flex:1;min-width:140px;padding:10px 12px;border:1px solid #d9e1dd;border-radius:4px;font-size:14px}" +
            ".sm-head button,.sm-foot button{padding:10px 14px;border-radius:4px;border:0;cursor:pointer;font-weight:600;font-size:13px;background:#0e3d34;color:#fff}" +
            ".sm-head button.alt,.sm-foot button.alt{background:#eef2f0;color:#1f2d29}.sm-foot button:disabled{opacity:.5;cursor:not-allowed}" +
            ".sm-map{height:min(58vh,420px);width:100%;z-index:1}.sm-res{max-height:150px;overflow:auto;border-bottom:1px solid #e4ebe7}" +
            ".sm-res div{padding:9px 14px;font-size:13px;cursor:pointer;border-bottom:1px solid #f1f4f2}.sm-res div:hover{background:#f6f8f7}" +
            ".sm-foot{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px;font-size:12px;color:#55635d;flex-wrap:wrap}.sm-addr{flex:1;min-width:180px;line-height:1.5}";
        d.head.appendChild(s);
    }
})(window, document);
