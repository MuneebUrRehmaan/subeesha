/* Products - CRUD with Cloudinary images */
A.ready(function () {
    var grid = document.getElementById("productGrid"), all = [], cats = [], esc = SUB.esc, mgr = null;
    grid.innerHTML = new Array(9).join('<div class="product-card"><div class="product-img sk" style="height:150px"></div><div class="product-info"><div class="sk sk-line" style="width:70%;height:14px"></div><div class="sk sk-line" style="width:45%"></div><div class="sk sk-line" style="width:30%;height:16px"></div></div></div>');

    function draw() {
        var q = document.getElementById("fSearch").value.toLowerCase().trim();
        var list = all.filter(function (p) { return !q || [p.name, p.category, p.sku].join(" ").toLowerCase().indexOf(q) > -1; });
        grid.innerHTML = list.length ? list.map(function (p) {
            var img = (p.images || [])[0];
            var stock = p.stock == null ? "-" : p.stock;
            return '<div class="product-card"><div class="product-img" style="overflow:hidden;position:relative">' +
                (img ? '<img src="' + esc(SUB.img(img, 400)) + '" alt="" style="width:100%;height:100%;object-fit:cover">' : '<i class="fa-solid fa-image" style="color:#c5cec9"></i>') +
                (p.active === false ? '<span class="status danger" style="position:absolute;top:8px;left:8px">Hidden</span>' : "") + "</div>" +
                '<div class="product-info"><h4>' + esc(p.name) + "</h4><p>" + esc(p.category || "No category") + " · Stock " + stock + (p.stock != null && p.stock <= 0 ? " (out)" : "") + "</p>" +
                "<b>" + A.money(p.price) + "</b>" + (p.oldPrice ? ' <s style="color:#88938f;font-size:11px">' + A.money(p.oldPrice) + "</s>" : "") +
                '<div style="display:flex;gap:6px;margin-top:10px"><button class="btn small secondary" onclick="openProductModal(\'' + esc(p.id) + '\')"><i class="fa-solid fa-pen"></i> Edit</button>' +
                '<button class="btn small danger" onclick="deleteProduct(\'' + esc(p.id) + '\')"><i class="fa-solid fa-trash"></i></button></div></div></div>';
        }).join("") : '<div class="a-empty" style="grid-column:1/-1">No products yet. Click "Add Product" to create one' + (A.isMgr() ? ' or import the demo data from the Dashboard' : "") + ".</div>";
    }
    function load() {
        A.drop("products");
        return Promise.all([A.load("products", true), A.load("categories", true)]).then(function (r) {
            all = r[0].sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); });
            cats = r[1].sort(function (a, b) { return SUB.num(a.order) - SUB.num(b.order); });
            draw();
        }).catch(A.err);
    }
    document.getElementById("fSearch").oninput = A.debounce(draw, 150);
    load();

    function list(v) { return String(v || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); }

    window.openProductModal = function (id) {
        var p = id ? all.filter(function (x) { return x.id === id; })[0] : null; p = p || {};
        var catOpts = '<option value="">- select category -</option>' + cats.map(function (c) { return '<option value="' + esc(c.slug || c.id) + '"' + ((p.categorySlug || "") === (c.slug || c.id) ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("");
        var chk = function (i, l, on) { return '<label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" id="' + i + '"' + (on ? " checked" : "") + "> " + l + "</label>"; };
        openModal(id ? "Edit Product" : "Add Product",
            '<div class="form-grid">' +
            '<div class="field full"><label>Product Name *</label><input id="pName" value="' + esc(p.name || "") + '"></div>' +
            '<div class="field"><label>Category *</label><select id="pCat">' + catOpts + "</select></div>" +
            '<div class="field"><label>SKU</label><input id="pSku" value="' + esc(p.sku || "") + '"></div>' +
            '<div class="field"><label>Price (Rs.) *</label><input id="pPrice" type="number" min="0" value="' + esc(p.price == null ? "" : p.price) + '"></div>' +
            '<div class="field"><label>Old Price (Rs.)</label><input id="pOld" type="number" min="0" value="' + esc(p.oldPrice || "") + '"></div>' +
            '<div class="field"><label>Stock *</label><input id="pStock" type="number" min="0" value="' + esc(p.stock == null ? "" : p.stock) + '"></div>' +
            '<div class="field"><label>Reseller Commission (%)</label><input id="pComm" type="number" min="0" max="90" value="' + esc(p.commission == null ? 10 : p.commission) + '"></div>' +
            '<div class="field"><label>Badge text (optional)</label><input id="pBadge" placeholder="HOT, NEW, BEST SELLER" value="' + esc(p.badge || "") + '"></div>' +
            '<div class="field"><label>Rating (0-5, optional)</label><input id="pRate" type="number" min="0" max="5" step="0.1" value="' + esc(p.rating || "") + '"></div>' +
            '<div class="field"><label>Colors (comma separated)</label><input id="pColors" placeholder="Black, White, Red" value="' + esc((p.colors || []).join(", ")) + '"></div>' +
            '<div class="field"><label>Sizes (comma separated)</label><input id="pSizes" placeholder="S, M, L, XL" value="' + esc((p.sizes || []).join(", ")) + '"></div>' +
            '<div class="field full"><label>Description</label><textarea id="pDesc" rows="3">' + esc(p.description || "") + "</textarea></div>" +
            '<div class="field full"><label>Images (Cloudinary)</label><div id="pImgs"></div></div>' +
            '<div class="field full" style="display:flex;gap:18px;flex-wrap:wrap">' + chk("pFeat", "Featured on homepage", p.featured) + chk("pNew", "New arrival", p.isNew) + chk("pActive", "Visible in store", p.active !== false) + "</div></div>",
            A.save(function () {
                if (mgr.busy()) throw new Error("Please wait for image uploads to finish.");
                var slug = A.val("pCat"), c = cats.filter(function (x) { return (x.slug || x.id) === slug; })[0];
                if (!A.val("pName") || !c) throw new Error("Product name and category are required.");
                if (A.val("pPrice") === "" || A.val("pStock") === "") throw new Error("Price and stock are required.");
                var data = {
                    name: A.val("pName"), category: c.name, categorySlug: slug, sku: A.val("pSku"), price: A.num("pPrice"), oldPrice: A.num("pOld"),
                    stock: Math.max(0, Math.floor(A.num("pStock"))), commission: A.num("pComm"), badge: A.val("pBadge"), rating: Math.min(5, A.num("pRate")),
                    colors: list(A.val("pColors")), sizes: list(A.val("pSizes")), description: A.val("pDesc"), images: mgr.urls(),
                    featured: document.getElementById("pFeat").checked, isNew: document.getElementById("pNew").checked, active: document.getElementById("pActive").checked,
                    updatedAt: SUB.now()
                };
                if (!data.images.length && !confirm("This product has no image. Save anyway?")) return false;
                var ref = id ? SUB.db.collection("products").doc(id) : SUB.db.collection("products").doc();
                if (!id) { data.createdAt = SUB.now(); data.sold = 0; }
                return ref.set(data, { merge: true }).then(function () { A.toast(id ? "Product updated" : "Product added"); return load(); });
            }), id ? "Update" : "Add Product");
        mgr = A.imageManager(document.getElementById("pImgs"), p.images || [], { max: 8, folder: "products" });
    };
    window.deleteProduct = function (id) {
        A.confirmDo("Delete this product permanently?", function () {
            return SUB.db.collection("products").doc(id).delete().then(function () { A.toast("Product deleted"); return load(); });
        });
    };
});
