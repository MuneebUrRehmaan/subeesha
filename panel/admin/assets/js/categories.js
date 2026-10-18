/* Categories - CRUD with Cloudinary image */
A.ready(function () {
    var body = document.getElementById("catBody"), cats = [], counts = {}, esc = SUB.esc, mgr = null;
    A.loading(body, 6);
    function draw() {
        A.rows(body, cats, 6, "No categories yet.", function (c) {
            return '<tr><td>' + (c.image ? '<img src="' + esc(SUB.img(c.image, 120)) + '" style="width:46px;height:46px;border-radius:8px;object-fit:cover" alt="">' : "-") + "</td><td><b>" + esc(c.name) + "</b><br><small style='color:#88938f'>" + esc(c.slug || c.id) + "</small></td><td>" + esc(c.tagline || "") + "</td><td>" + esc(c.group || "-") + "</td><td>" + (counts[c.slug || c.id] || 0) +
                '</td><td><button class="btn small secondary" onclick="openCategoryModal(\'' + esc(c.id) + '\')"><i class="fa-solid fa-pen"></i></button> <button class="btn small danger" onclick="deleteCategory(\'' + esc(c.id) + '\')"><i class="fa-solid fa-trash"></i></button></td></tr>';
        });
    }
    function load() {
        return Promise.all([A.load("categories", true), A.load("products", true)]).then(function (r) {
            cats = r[0].sort(function (a, b) { return SUB.num(a.order) - SUB.num(b.order); });
            counts = {}; r[1].forEach(function (p) { var k = p.categorySlug || SUB.slug(p.category); counts[k] = (counts[k] || 0) + 1; });
            draw();
        }).catch(A.err);
    }
    load();
    window.openCategoryModal = function (id) {
        var c = id ? cats.filter(function (x) { return x.id === id; })[0] : {}; c = c || {};
        openModal(id ? "Edit Category" : "Add Category",
            '<div class="form-grid"><div class="field"><label>Name *</label><input id="cName" value="' + esc(c.name || "") + '"></div>' +
            '<div class="field"><label>Icon (Ionicons name)</label><input id="cIcon" placeholder="shirt-outline" value="' + esc(c.icon || "") + '"></div>' +
            '<div class="field full"><label>Tagline</label><input id="cTag" value="' + esc(c.tagline || "") + '"></div>' +
            '<div class="field"><label>Filter Group</label><select id="cGroup">' + ["fashion", "beauty", "tech", "home"].map(function (g) { return "<option" + (c.group === g ? " selected" : "") + ">" + g + "</option>"; }).join("") + "</select></div>" +
            '<div class="field"><label>Display Order</label><input id="cOrder" type="number" value="' + esc(c.order == null ? cats.length : c.order) + '"></div>' +
            '<div class="field full"><label>Image (Cloudinary)</label><div id="cImg"></div></div></div>',
            A.save(function () {
                if (mgr.busy()) throw new Error("Please wait for the image upload to finish.");
                var name = A.val("cName"); if (!name) throw new Error("Category name is required.");
                var slug = id ? (c.slug || id) : SUB.slug(name);
                if (!id && cats.some(function (x) { return (x.slug || x.id) === slug; })) throw new Error("A category with this name already exists.");
                var data = { name: name, slug: slug, icon: A.val("cIcon") || "pricetag-outline", tagline: A.val("cTag"), group: A.val("cGroup"), order: A.num("cOrder"), image: mgr.urls()[0] || "" };
                return SUB.db.collection("categories").doc(id || slug).set(data, { merge: true }).then(function () { A.toast("Category saved"); return load(); });
            }), "Save");
        mgr = A.imageManager(document.getElementById("cImg"), c.image ? [c.image] : [], { max: 1, folder: "categories" });
    };
    window.deleteCategory = function (id) {
        var c = cats.filter(function (x) { return x.id === id; })[0];
        if ((counts[c.slug || c.id] || 0) > 0) return A.toast("Move or delete the products in this category first.");
        A.confirmDo("Delete this category?", function () { return SUB.db.collection("categories").doc(id).delete().then(function () { A.toast("Category deleted"); return load(); }); });
    };
});
