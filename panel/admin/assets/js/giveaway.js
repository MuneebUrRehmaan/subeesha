/* Giveaway management (uses the page's own modal + card design) */
A.ready(function () {
    var esc = SUB.esc, list = [], editing = null, bannerUrl = "", prizeMgrs = [], busyUploads = 0;
    var box = document.getElementById("giveawayList");

    /* the page has its own modal (#giveawayModal) - common.js closeModal targets #modal */
    window.closeModal = function () {
        var m = document.getElementById("giveawayModal"); if (m) m.classList.remove("show");
        var v = document.getElementById("gwView"); if (v) v.classList.remove("show");
    };
    function state(g) {
        var now = Date.now(), s = SUB.ms(g.startDate), e = SUB.ms(g.endDate);
        if (g.status === "Ended" || e <= now) return "expired";
        return s > now ? "scheduled" : "active";
    }
    function remaining(g) {
        var st = state(g); if (st === "expired") return "Ended";
        var ms = (st === "scheduled" ? SUB.ms(g.startDate) : SUB.ms(g.endDate)) - Date.now(), d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5);
        return (st === "scheduled" ? "Starts in " : "") + d + "d " + h + "h" + (st === "active" ? " left" : "");
    }
    function draw() {
        document.getElementById("totalGiveaways").textContent = list.length;
        ["active", "scheduled", "expired"].forEach(function (k) { document.getElementById(k + "Giveaways").textContent = list.filter(function (g) { return state(g) === k; }).length; });
        if (!list.length) return;
        box.innerHTML = '<div class="giveaway-grid">' + list.map(function (g) {
            var st = state(g);
            return '<div class="giveaway-card"><div class="giveaway-banner">' + (g.banner ? '<img src="' + esc(SUB.img(g.banner, 700)) + '" alt="">' : '<div class="giveaway-banner-placeholder"><i class="fa-solid fa-gift"></i></div>') + "</div>" +
                '<div class="giveaway-info"><div class="giveaway-title-row"><h3>' + esc(g.title) + '</h3><span class="status ' + st + '">' + st.charAt(0).toUpperCase() + st.slice(1) + "</span></div><p>" + esc((g.description || "No description").slice(0, 110)) + "</p>" +
                '<div class="giveaway-meta"><div class="meta-box"><small>Winners</small><strong>' + SUB.num(g.winnersCount) + '</strong></div><div class="meta-box"><small>Entries</small><strong>' + (g._entries == null ? "-" : g._entries) + '</strong></div><div class="meta-box"><small>Ends</small><strong>' + A.date(g.endDate) + '</strong></div></div>' +
                '<div class="remaining">' + remaining(g) + '</div><div class="card-actions"><button class="btn primary" onclick="viewGiveaway(\'' + esc(g.id) + '\')"><i class="fa-solid fa-users"></i> Entries</button> <button class="btn secondary" onclick="openCreateModal(\'' + esc(g.id) + '\')"><i class="fa-solid fa-pen"></i></button>' +
                (st !== "expired" ? ' <button class="btn warning" onclick="expireGiveaway(\'' + esc(g.id) + '\')">Expire</button>' : "") + ' <button class="btn danger" onclick="deleteGiveaway(\'' + esc(g.id) + '\')"><i class="fa-solid fa-trash"></i></button></div></div></div>';
        }).join("") + "</div>";
    }
    function load() {
        return Promise.all([SUB.db.collection("giveaways").get(), SUB.db.collection("giveawayEntries").get()]).then(function (r) {
            var counts = {}; r[1].forEach(function (d) { var k = d.data().giveawayId; counts[k] = (counts[k] || 0) + 1; });
            list = SUB.docs(r[0]).map(function (g) { g._entries = counts[g.id] || 0; return g; }).sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); });
            if (!list.length) { box.innerHTML = box.innerHTML.indexOf("empty-state") > -1 ? box.innerHTML : box.innerHTML; }
            draw();
        }).catch(A.err);
    }
    load();

    /* ---------- prize forms ---------- */
    window.generatePrizeForms = function (existing) {
        var n = Number(document.getElementById("winnerCount").value), c = document.getElementById("prizesContainer"), old = Array.isArray(existing) ? existing : [];
        c.innerHTML = ""; prizeMgrs = [];
        var pos = ["GRAND PRIZE", "2ND PRIZE", "3RD PRIZE"];
        for (var i = 0; i < n; i++) {
            var p = old[i] || {}, label = pos[i] || (i + 1) + "TH PRIZE";
            var d = document.createElement("div"); d.className = "prize-form";
            d.innerHTML = '<div class="prize-form-head"><h4><i class="fa-solid fa-trophy"></i> Prize ' + (i + 1) + '</h4></div><div class="form-grid"><div class="form-group"><label>Prize Name *</label><input id="pz_n' + i + '" value="' + esc(p.name || "") + '"></div>' +
                '<div class="form-group"><label>Position label</label><input id="pz_p' + i + '" value="' + esc(p.position || label) + '"></div><div class="form-group full"><label>Prize Description</label><input id="pz_d' + i + '" value="' + esc(p.description || "") + '"></div><div class="form-group full"><label>Prize Image (Cloudinary)</label><div id="pz_i' + i + '"></div></div></div>';
            c.appendChild(d);
            prizeMgrs.push(A.imageManager(d.querySelector("#pz_i" + i), p.image ? [p.image] : [], { max: 1, folder: "giveaways" }));
        }
    };
    window.previewBanner = function (input) {
        var f = input.files[0]; if (!f) return;
        busyUploads++;
        SUB.cloud.upload(f, { folder: "giveaways" }).then(function (r) {
            bannerUrl = r.url; var im = document.getElementById("bannerPreview"); im.src = SUB.img(r.url, 700); im.style.display = "block";
        }).catch(A.err).finally(function () { busyUploads--; input.value = ""; });
    };
    window.openCreateModal = function (id) {
        editing = id ? list.filter(function (g) { return g.id === id; })[0] : null;
        var g = editing || {};
        document.querySelector("#giveawayModal .modal-head h3").textContent = editing ? "Edit Giveaway" : "Create New Giveaway";
        document.getElementById("giveawayTitle").value = g.title || "";
        var n = String(g.winnersCount || 1); if (!document.querySelector('#winnerCount option[value="' + n + '"]')) n = "1";
        document.getElementById("winnerCount").value = n;
        document.getElementById("startDate").value = A.toInput(g.startDate) || A.toInput(new Date());
        document.getElementById("endDate").value = A.toInput(g.endDate);
        document.getElementById("giveawayDescription").value = g.description || "";
        bannerUrl = g.banner || ""; var im = document.getElementById("bannerPreview"); im.src = bannerUrl ? SUB.img(bannerUrl, 700) : ""; im.style.display = bannerUrl ? "block" : "none";
        window.generatePrizeForms(g.prizes || []);
        document.getElementById("giveawayModal").classList.add("show");
    };
    window.createGiveaway = function () {
        var title = A.val("giveawayTitle"), start = A.fromInput("startDate"), end = A.fromInput("endDate"), n = Number(A.val("winnerCount"));
        if (!title || !start || !end) return A.toast("Title, start date and end date are required.");
        if (end.toMillis() <= start.toMillis()) return A.toast("End date must be after the start date.");
        if (busyUploads || prizeMgrs.some(function (m) { return m.busy(); })) return A.toast("Please wait for image uploads to finish.");
        var prizes = [];
        for (var i = 0; i < n; i++) {
            var name = A.val("pz_n" + i); if (!name) return A.toast("Enter a name for prize " + (i + 1) + ".");
            prizes.push({ name: name, position: A.val("pz_p" + i), description: A.val("pz_d" + i), image: prizeMgrs[i].urls()[0] || "" });
        }
        var data = { title: title, description: A.val("giveawayDescription"), banner: bannerUrl, winnersCount: n, startDate: start, endDate: end, prizes: prizes, updatedAt: SUB.now() };
        var ref = editing ? SUB.db.collection("giveaways").doc(editing.id) : SUB.db.collection("giveaways").doc();
        if (!editing) { data.status = "Active"; data.createdAt = SUB.now(); data.winners = []; }
        ref.set(data, { merge: true }).then(function () { A.toast("Giveaway saved"); closeModal(); return load(); }).catch(A.err);
    };
    window.expireGiveaway = function (id) { A.confirmDo("Expire this giveaway now?", function () { return SUB.db.collection("giveaways").doc(id).update({ status: "Ended" }).then(function () { A.toast("Giveaway expired"); return load(); }); }); };
    window.deleteGiveaway = function (id) { A.confirmDo("Delete this giveaway and its entries?", function () {
        return SUB.db.collection("giveawayEntries").where("giveawayId", "==", id).get().then(function (s) {
            var b = SUB.db.batch(); s.forEach(function (d) { b.delete(d.ref); }); b.delete(SUB.db.collection("giveaways").doc(id)); return b.commit();
        }).then(function () { A.toast("Giveaway deleted"); return load(); }); }); };

    /* ---------- entries + winner draw ---------- */
    window.viewGiveaway = function (id) {
        var g = list.filter(function (x) { return x.id === id; })[0];
        SUB.db.collection("giveawayEntries").where("giveawayId", "==", id).get().then(function (s) {
            var entries = SUB.docs(s).sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); });
            var v = document.getElementById("gwView");
            if (!v) { v = document.createElement("div"); v.className = "modal-bg"; v.id = "gwView"; v.addEventListener("click", function (e) { if (e.target === v) v.classList.remove("show"); }); document.body.appendChild(v); }
            var wins = g.winners || [];
            v.innerHTML = '<div class="modal" style="max-width:820px"><div class="modal-head"><h3>' + esc(g.title) + ' - Entries (' + entries.length + ')</h3><button onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div><div class="modal-body">' +
                (wins.length ? '<div style="background:#eaf5ef;border-radius:10px;padding:12px;margin-bottom:12px;font-size:13px"><b><i class="fa-solid fa-trophy"></i> Winners</b><br>' + wins.map(function (w, i) { return (i + 1) + ". " + esc(w.name) + " (" + esc(w.city || "") + ") - " + esc(w.prize || ""); }).join("<br>") + "</div>" : "") +
                (entries.length ? '<div style="overflow:auto;max-height:340px"><table class="table" style="width:100%;font-size:12px"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>City</th><th>Instagram</th></tr></thead><tbody>' + entries.map(function (e) { return "<tr><td>" + esc(e.fullName) + "</td><td>" + esc(e.email) + "</td><td>" + esc(e.phone) + "</td><td>" + esc(e.city) + "</td><td>" + esc(e.instagramUsername) + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="a-empty">No entries yet.</p>') +
                '</div><div class="modal-foot"><button class="btn secondary" id="gwCsv">Export CSV</button><button class="btn primary" id="gwDraw"' + (entries.length < 1 ? " disabled" : "") + '><i class="fa-solid fa-dice"></i> Draw ' + SUB.num(g.winnersCount) + " Winner(s)</button></div></div>";
            v.classList.add("show");
            v.querySelector("#gwCsv").onclick = function () { A.csv("giveaway-entries.csv", [["Name", "Email", "Phone", "City", "Instagram", "Link"]].concat(entries.map(function (e) { return [e.fullName, e.email, e.phone, e.city, e.instagramUsername, e.instagramLink]; }))); };
            v.querySelector("#gwDraw").onclick = function () {
                if (wins.length && !confirm("Winners are already drawn. Draw again and replace them?")) return;
                var pool = entries.slice(), picked = [], n = Math.min(SUB.num(g.winnersCount), pool.length), arr = new Uint32Array(pool.length + 1);
                while (picked.length < n) { (window.crypto).getRandomValues(arr); var i = arr[0] % pool.length; picked.push(pool.splice(i, 1)[0]); }
                var winners = picked.map(function (e, i) { return { name: e.fullName, city: e.city, email: e.email, prize: ((g.prizes || [])[i] || {}).name || "Winner" }; });
                SUB.db.collection("giveaways").doc(id).update({ winners: winners, status: "Ended" }).then(function () { A.toast("Winners drawn"); return load(); }).then(function () { window.viewGiveaway(id); }).catch(A.err);
            };
        }).catch(A.err);
    };
    var modalBg = document.getElementById("giveawayModal");
    modalBg.addEventListener("click", function (e) { if (e.target === modalBg) closeModal(); });
});
