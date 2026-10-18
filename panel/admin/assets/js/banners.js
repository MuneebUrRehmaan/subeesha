/* Homepage hero slides + popup ad */
A.ready(function () {
    var body = document.getElementById("banBody"), list = [], esc = SUB.esc, mgr = null;
    A.loading(body, 6);
    function draw() {
        A.rows(body, list, 6, "No banners yet. The default design is shown on the homepage until you add slides.", function (b) {
            return '<tr><td>' + (b.image ? '<img src="' + esc(SUB.img(b.image, 200)) + '" style="width:90px;height:50px;border-radius:8px;object-fit:cover" alt="">' : "-") + "</td><td>" + (b.type === "hero" ? "Hero slide" : "Popup ad") + "</td><td><b>" + esc(b.title || b.titleStrong || b.small || "-") + "</b> " + esc(b.titleEm || "") + "</td><td>" + SUB.num(b.order) + "</td><td>" + A.pill(b.active === false ? "Inactive" : "Active") + "</td>" +
                '<td><button class="btn small secondary" onclick="openBannerModal(\'' + esc(b.type) + "','" + esc(b.id) + '\')"><i class="fa-solid fa-pen"></i></button> <button class="btn small danger" onclick="deleteBanner(\'' + esc(b.id) + '\')"><i class="fa-solid fa-trash"></i></button></td></tr>';
        });
    }
    function load() { return A.load("banners", true).then(function (l) { list = l.sort(function (a, b) { return (a.type > b.type ? 1 : -1) || SUB.num(a.order) - SUB.num(b.order); }); draw(); }).catch(A.err); }
    load();
    window.openBannerModal = function (type, id) {
        var b = id ? list.filter(function (x) { return x.id === id; })[0] : {}; b = b || {};
        var f = function (i, l, v, full, ph) { return '<div class="field' + (full ? " full" : "") + '"><label>' + l + '</label><input id="' + i + '" value="' + esc(v || "") + '" placeholder="' + esc(ph || "") + '"></div>'; };
        var fields = type === "hero"
            ? f("bTag", "Small tag", b.tag, 0, "NEW SEASON COLLECTION") + f("bTitle", "Headline (line 1) *", b.title) + f("bEm", "Headline (line 2, italic)", b.titleEm) + f("bText", "Description", b.text, 1) +
              f("bB1", "Button 1 text", b.btn1Text) + f("bL1", "Button 1 link", b.btn1Link, 0, "page/shop.html") + f("bB2", "Button 2 text", b.btn2Text) + f("bL2", "Button 2 link", b.btn2Link, 0, "#categories")
            : f("bSmall", "Small label", b.small, 0, "LIMITED TIME") + f("bPre", "Headline start", b.titlePre, 0, "UP TO") + f("bStrong", "Headline highlight *", b.titleStrong, 0, "50% OFF") + f("bText", "Description", b.text) + f("bB1", "Button text", b.btnText) + f("bL1", "Button link", b.btnLink, 0, "#sale");
        openModal((id ? "Edit " : "Add ") + (type === "hero" ? "Hero Slide" : "Popup Ad"),
            '<div class="form-grid">' + fields + '<div class="field"><label>Order</label><input id="bOrder" type="number" value="' + esc(b.order == null ? list.length : b.order) + '"></div><div class="field"><label>Status</label><select id="bActive"><option value="1"' + (b.active === false ? "" : " selected") + '>Active</option><option value="0"' + (b.active === false ? " selected" : "") + '>Inactive</option></select></div>' +
            '<div class="field full"><label>Background image (Cloudinary) *</label><div id="bImg"></div></div></div>',
            A.save(function () {
                if (mgr.busy()) throw new Error("Please wait for the image upload to finish.");
                var img = mgr.urls()[0]; if (!img) throw new Error("Please upload an image.");
                var d = { type: type, image: img, order: A.num("bOrder"), active: A.val("bActive") === "1" };
                if (type === "hero") { if (!A.val("bTitle")) throw new Error("Headline is required."); Object.assign(d, { tag: A.val("bTag"), title: A.val("bTitle"), titleEm: A.val("bEm"), text: A.val("bText"), btn1Text: A.val("bB1"), btn1Link: A.val("bL1"), btn2Text: A.val("bB2"), btn2Link: A.val("bL2") }); }
                else { if (!A.val("bStrong")) throw new Error("Headline highlight is required."); Object.assign(d, { small: A.val("bSmall"), titlePre: A.val("bPre"), titleStrong: A.val("bStrong"), text: A.val("bText"), btnText: A.val("bB1"), btnLink: A.val("bL1") }); }
                var ref = id ? SUB.db.collection("banners").doc(id) : SUB.db.collection("banners").doc();
                return ref.set(d).then(function () { A.toast("Banner saved"); return load(); });
            }), "Save");
        mgr = A.imageManager(document.getElementById("bImg"), b.image ? [b.image] : [], { max: 1, folder: "banners" });
    };
    window.deleteBanner = function (id) { A.confirmDo("Delete this banner?", function () { return SUB.db.collection("banners").doc(id).delete().then(function () { A.toast("Banner deleted"); return load(); }); }); };
});
