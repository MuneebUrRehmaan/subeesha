/* Delivery charges: flat | by city (manual) | by map zones (auto, Leaflet) */
A.ready(function () {
    var esc = SUB.esc, cities = [], zones = [], CITIES = ["Abbottabad", "Attock", "Badin", "Bahawalpur", "Bannu", "Burewala", "Charsadda", "Chiniot", "Chitral", "Dadu", "Dera Ghazi Khan", "Dera Ismail Khan", "Faisalabad", "Gilgit", "Gujranwala", "Gujrat", "Gwadar", "Hafizabad", "Hub", "Hunza", "Hyderabad", "Islamabad", "Jacobabad", "Jamshoro", "Jhang", "Jhelum", "Karachi", "Kasur", "Khairpur", "Khanewal", "Khuzdar", "Kohat", "Kotri", "Lahore", "Larkana", "Mandi Bahauddin", "Mansehra", "Mardan", "Mianwali", "Mingora", "Mirpur", "Mirpurkhas", "Multan", "Murree", "Muzaffarabad", "Muzaffargarh", "Narowal", "Nawabshah", "Nowshera", "Okara", "Peshawar", "Quetta", "Rahim Yar Khan", "Rawalpindi", "Sadiqabad", "Sahiwal", "Sargodha", "Sheikhupura", "Shikarpur", "Sialkot", "Sibi", "Skardu", "Sukkur", "Swabi", "Tando Allahyar", "Tando Muhammad Khan", "Thatta", "Turbat", "Vehari", "Wah Cantt", "Zhob"], map = null, L = null, layer = null;
    var $ = function (id) { return document.getElementById(id); };

    function mode() { var r = document.querySelector('input[name="shMode"]:checked'); return r ? r.value : "flat"; }
    function showMode() {
        var m = mode();
        [].forEach.call(document.querySelectorAll(".sh-mode"), function (l) { l.classList.toggle("on", l.querySelector("input").checked); });
        $("pFlat").style.display = m === "flat" ? "" : "none";
        $("pCity").style.display = m === "city" ? "" : "none";
        $("pZones").style.display = m === "zones" ? "" : "none";
        if (m === "zones") initMap();
    }
    [].forEach.call(document.querySelectorAll('input[name="shMode"]'), function (r) { r.addEventListener("change", showMode); });

    /* ---------- cities ---------- */
    $("shCitySel").innerHTML = CITIES.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("");
    function drawCities() {
        A.rows($("cityBody"), cities, 3, "No cities added. Every city pays the default charge.", function (c, i) {
            return "<tr><td><b>" + esc(c.name) + '</b></td><td><input type="number" min="0" value="' + esc(c.charge) + '" onchange="cityChg(' + i + ',this.value)"></td><td><button class="btn small danger" onclick="delCity(' + i + ')"><i class="fa-solid fa-trash"></i></button></td></tr>';
        });
    }
    function def() { return A.num("shCityDef") || A.num("shCharge") || 0; }
    window.addCity = function () {
        var n = $("shCitySel").value; if (!n) return;
        if (cities.some(function (c) { return c.name === n; })) return A.toast(n + " is already in the list.");
        cities.push({ name: n, charge: def() }); cities.sort(function (a, b) { return a.name.localeCompare(b.name); }); drawCities();
    };
    window.addAllCities = function () {
        CITIES.forEach(function (n) { if (!cities.some(function (c) { return c.name === n; })) cities.push({ name: n, charge: def() }); });
        cities.sort(function (a, b) { return a.name.localeCompare(b.name); }); drawCities();
    };
    window.cityChg = function (i, v) { cities[i].charge = Math.max(0, SUB.num(v)); };
    window.delCity = function (i) { cities.splice(i, 1); drawCities(); };

    /* ---------- zones ---------- */
    function drawZones() {
        A.rows($("zoneBody"), zones, 4, "No zones yet. Click on the map to add one.", function (z, i) {
            return '<tr><td><input value="' + esc(z.name) + '" onchange="zoneSet(' + i + ",'name',this.value)\" style=\"width:100%;min-width:140px;padding:8px\"></td>" +
                '<td><input type="number" min="1" value="' + esc(z.radius) + '" onchange="zoneSet(' + i + ",'radius',this.value)\"></td>" +
                '<td><input type="number" min="0" value="' + esc(z.charge) + '" onchange="zoneSet(' + i + ",'charge',this.value)\"></td>" +
                '<td style="white-space:nowrap"><button class="btn small secondary" onclick="zoneGo(' + i + ')"><i class="fa-solid fa-location-crosshairs"></i></button> <button class="btn small danger" onclick="zoneDel(' + i + ')"><i class="fa-solid fa-trash"></i></button></td></tr>';
        });
        drawCircles();
    }
    function drawCircles() {
        if (!map || !layer) return;
        layer.clearLayers();
        zones.forEach(function (z) {
            L.circle([z.lat, z.lng], { radius: SUB.num(z.radius) * 1000, color: "#0e3d34", weight: 2, fillColor: "#0e3d34", fillOpacity: .12 })
                .bindTooltip(z.name + " - Rs. " + z.charge, { permanent: false }).addTo(layer);
            L.marker([z.lat, z.lng]).addTo(layer);
        });
    }
    window.zoneSet = function (i, k, v) { zones[i][k] = k === "name" ? String(v).trim() : Math.max(k === "radius" ? 1 : 0, SUB.num(v)); drawCircles(); };
    window.zoneDel = function (i) { zones.splice(i, 1); drawZones(); };
    window.zoneGo = function (i) { if (map && zones[i]) map.setView([zones[i].lat, zones[i].lng], 11); };
    function addZone(lat, lng, name) {
        zones.push({ name: name || "Zone " + (zones.length + 1), lat: lat, lng: lng, radius: Math.max(1, A.num("zRad") || 10), charge: Math.max(0, A.num("zChg")) });
        drawZones();
        if (!name) SUB.map.reverse(lat, lng).then(function (r) { var z = zones.filter(function (x) { return x.lat === lat && x.lng === lng; })[0]; if (z && r.city) { z.name = r.city; drawZones(); } });
    }
    function initMap() {
        if (map) { setTimeout(function () { map.invalidateSize(); }, 60); return; }
        SUB.map.load().then(function (Lf) {
            L = Lf; map = L.map($("zMap")).setView([27.5, 68.5], 6); SUB.map.tiles(L, map); layer = L.layerGroup().addTo(map);
            map.on("click", function (e) { addZone(e.latlng.lat, e.latlng.lng); });
            drawCircles();
            if (zones.length) { var b = L.featureGroup(zones.map(function (z) { return L.circle([z.lat, z.lng], { radius: z.radius * 1000 }); })); map.fitBounds(b.getBounds(), { maxZoom: 11 }); }
            setTimeout(function () { map.invalidateSize(); }, 80);
        }).catch(A.err);
    }
    window.zSearch = function () {
        var q = A.val("zQ"); if (!q || !map) return;
        SUB.map.search(q).then(function (list) {
            if (!list.length) return A.toast("No results found.");
            map.setView([list[0].lat, list[0].lng], 11);
            if (confirm("Add a delivery zone for:\n" + list[0].name + " ?")) addZone(list[0].lat, list[0].lng, q.replace(/\b\w/g, function (c) { return c.toUpperCase(); }));
        }).catch(A.err);
    };
    $("zQ").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); window.zSearch(); } });

    /* ---------- load / save ---------- */
    SUB.settings("shipping", true).then(function (s) {
        document.querySelector('input[name="shMode"][value="' + (s.mode || "flat") + '"]').checked = true;
        $("shFree").value = s.freeAbove; $("shPartner").value = s.partner || ""; $("shCharge").value = s.charge;
        $("shCityDef").value = s.cityDefault != null ? s.cityDefault : s.charge; $("shZoneDef").value = s.zoneDefault != null ? s.zoneDefault : s.charge;
        cities = (s.cities || []).map(function (c) { return { name: c.name, charge: SUB.num(c.charge) }; });
        zones = (s.zones || []).map(function (z) { return { name: z.name, lat: SUB.num(z.lat), lng: SUB.num(z.lng), radius: SUB.num(z.radius), charge: SUB.num(z.charge) }; });
        drawCities(); drawZones(); showMode();
    }).catch(A.err);

    window.saveShipping = function () {
        var m = mode(), d = { mode: m, charge: A.num("shCharge"), freeAbove: A.num("shFree"), partner: A.val("shPartner"), cityDefault: A.num("shCityDef"), zoneDefault: A.num("shZoneDef"), cities: cities, zones: zones };
        if ([d.charge, d.freeAbove, d.cityDefault, d.zoneDefault].some(function (v) { return v < 0; })) return A.toast("Values cannot be negative.");
        if (m === "zones" && !zones.length && !confirm("No zones are defined, so every order will pay the 'outside zones' charge. Save anyway?")) return;
        SUB.saveSettings("shipping", d).then(function () { A.toast("Delivery settings saved"); }).catch(A.err);
    };
});
