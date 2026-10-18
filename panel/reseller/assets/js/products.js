/* Reseller - browse products, create customer orders */
R.ready(function () {
    var grid = document.querySelector(".product-grid"); if (!grid) return;
    var esc = SUB.esc, products = [], selected = null, qty = 1;
    if (!SUB.configured) return;    // keep static demo grid

    function draw(list) {
        grid.innerHTML = list.length ? list.map(function (p) {
            var earn = Math.round(p._price * SUB.num(p.commission) / 100);
            return '<div class="product-card" data-product="' + esc(p.name) + '" data-id="' + esc(p.id) + '"><div class="product-image"><span class="commission-badge">' + SUB.num(p.commission) + '% Commission</span><img src="' + esc(SUB.img(p._img, 600)) + '" alt="' + esc(p.name) + '"></div>' +
                '<div class="product-info"><span class="category">' + esc(p.category || "") + "</span><h3>" + esc(p.name) + '</h3><div class="product-price"><strong>' + SUB.money(p._price) + "</strong><span>You Earn: " + SUB.money(earn) + "</span></div>" +
                '<div class="product-actions"><button class="share-btn" onclick="shareProduct(\'' + esc(p.name).replace(/'/g, "") + "','" + esc(p.id) + '\')"><ion-icon name="share-social-outline"></ion-icon> Share</button>' +
                '<button class="order-btn" onclick="openOrderModal(\'' + esc(p.id) + '\')"' + (p._stock <= 0 ? " disabled" : "") + '><ion-icon name="add-circle-outline"></ion-icon> ' + (p._stock <= 0 ? "Out of Stock" : "Create Order") + "</button></div></div></div>";
        }).join("") : '<p style="grid-column:1/-1;text-align:center;color:#68736e;padding:30px">No products available yet.</p>';
    }
    SUB.catalog().then(function (c) {
        products = c.products.filter(function (p) { return SUB.num(p.commission) > 0; });
        draw(products);
        var search = document.getElementById("productSearch");
        if (search) search.addEventListener("keyup", function () {
            var v = this.value.toLowerCase();
            draw(products.filter(function (p) { return p.name.toLowerCase().indexOf(v) > -1; }));
        });
    }).catch(R.err);

    var modal = document.getElementById("orderModal");
    window.openOrderModal = function (id) {
        selected = products.filter(function (p) { return p.id === id; })[0]; if (!selected) return;
        qty = 1;
        document.getElementById("modalProductName").textContent = selected.name;
        document.getElementById("modalProductPrice").textContent = SUB.money(selected._price);
        document.getElementById("quantityValue").textContent = qty;
        updateOrderSummary();
        modal.classList.add("show"); document.body.style.overflow = "hidden";
    };
    window.changeQuantity = function (v) {
        qty = Math.max(1, Math.min(10, qty + v));
        if (selected && qty > selected._stock) { qty = Math.max(1, selected._stock); R.toast("Only " + selected._stock + " in stock."); }
        document.getElementById("quantityValue").textContent = qty; updateOrderSummary();
    };
    function updateOrderSummary() {
        if (!selected) return;
        var total = selected._price * qty, comm = Math.round(total * SUB.num(selected.commission) / 100);
        document.getElementById("summaryPrice").textContent = SUB.money(selected._price) + " \u00d7 " + qty;
        document.getElementById("summaryCommission").textContent = SUB.money(comm);
        document.getElementById("summaryTotal").textContent = SUB.money(total);
    }
    var form = document.getElementById("createOrderForm"); var placing = false;
    if (form) form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (placing || !selected) return;
        var name = document.getElementById("customerName").value.trim(), phone = document.getElementById("customerPhone").value.trim();
        var city = document.getElementById("customerCity").value.trim(), addr = document.getElementById("customerAddress").value.trim();
        var pay = form.querySelector("select").value;
        if (!name || !phone || !city || !addr) return R.toast("Please fill all required fields.");
        placing = true;
        SUB.placeOrder({
            items: [{ id: selected.id, qty: qty }], customer: { name: name, phone: phone, city: city, address: addr, province: "", area: "", postal: "", email: "" },
            paymentMethod: pay, source: "reseller", resellerId: R.me.id
        }).then(function (o) {
            window.closeOrderModal();
            R.toast("Order " + o.orderNo + " placed successfully!");
            setTimeout(function () { location.href = "orders.html"; }, 700);
        }).catch(function (e) { placing = false; R.err(e); });
    });
});
