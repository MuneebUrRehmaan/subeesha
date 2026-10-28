(function (w, d) {
  "use strict";
  var selectedSize = "", selectedColor = "", selectedQty = 1, currentProduct = null, currentImages = [];
  var root = "../assets/";
  function esc(v) { return SUB.esc(v); }
  function imageUrl(v, width) { return SUB.img(v, width || 1000); }
  function showMessage(message) {
    var el = d.getElementById("productMessage");
    if (el) { el.hidden = false; el.textContent = message; }
    var content = d.getElementById("productDetail"); if (content) content.style.display = "none";
  }
  function render(p) {
    currentProduct = p;
    currentImages = (p.images || []).filter(Boolean);
    if (!currentImages.length && p._img) currentImages = [p._img];
    if (!currentImages.length) currentImages = [SUB.url("assets/images/logo.jpg")];
    selectedSize = "";
    selectedColor = (p.colors || []).length ? p.colors[0] : "";
    selectedQty = 1;
    d.title = (p.name || "Product") + " | Subeesha";
    d.getElementById("breadcrumbName").textContent = p.name || "Product";
    var sizes = p.sizes || [], colors = p.colors || [], soldOut = p._stock <= 0;
    var stars = "";
    if (p.rating) {
      for (var i = 1; i <= 5; i++) stars += '<i class="fa-' + (i <= Math.round(p.rating) ? 'solid' : 'regular') + ' fa-star"></i>';
    }
    var gallery = '<div class="pd-gallery"><div class="pd-main-image"><img id="pdMainImage" src="' + esc(imageUrl(currentImages[0], 1200)) + '" alt="' + esc(p.name) + '">' + (p._pct ? '<span class="pd-sale-badge">' + p._pct + '% OFF</span>' : '') + '</div>';
    if (currentImages.length > 1) {
      gallery += '<div class="pd-thumbnails" aria-label="Product images">' + currentImages.map(function (img, i) {
        return '<button class="pd-thumb' + (i === 0 ? ' active' : '') + '" type="button" data-image-index="' + i + '" aria-label="Show image ' + (i + 1) + '"><img src="' + esc(imageUrl(img, 220)) + '" alt=""></button>';
      }).join('') + '</div>';
    }
    gallery += '</div>';
    var summary = '<section class="pd-summary"><span class="pd-category">' + esc(p.category || 'Collection') + '</span><h1>' + esc(p.name || 'Product') + '</h1>';
    if (p.rating) summary += '<div class="pd-rating"><span>' + stars + '</span><span class="pd-rating-text">' + Number(p.rating).toFixed(1) + ' out of 5</span></div>';
    summary += '<div class="pd-price-row"><strong>' + SUB.money(p._price) + '</strong>' + (p._old ? '<del>' + SUB.money(p._old) + '</del><span class="pd-discount">Save ' + p._pct + '%</span>' : '') + '</div>';
    if (p.description) summary += '<p class="pd-description">' + esc(p.description).replace(/\n/g, '<br>') + '</p>';
    if (p.sku) summary += '<p class="pd-sku">SKU: <span>' + esc(p.sku) + '</span></p>';
    if (colors.length) summary += '<div class="pd-option-block"><div class="pd-option-head"><span>Color</span><strong id="pdSelectedColor">' + esc(selectedColor) + '</strong></div><div class="pd-options pd-colors">' + colors.map(function (c) { var colorValue = String(c).toLowerCase().trim(); var safeColor = ({black:'#111111',white:'#ffffff',red:'#c62828',blue:'#2563eb',green:'#24804a',yellow:'#e5ba19',pink:'#e78aa6',purple:'#8253a1',brown:'#8b5e3c',grey:'#8b9290',gray:'#8b9290',orange:'#e77a21',beige:'#d9c6a0',navy:'#172554'})[colorValue] || '#d9d9d9'; return '<button type="button" class="pd-color' + (c === selectedColor ? ' active' : '') + '" data-color="' + esc(c) + '" aria-label="' + esc(c) + '" title="' + esc(c) + '"><span style="background:' + safeColor + '"></span><em>' + esc(c) + '</em></button>'; }).join('') + '</div></div>';
    if (sizes.length) summary += '<div class="pd-option-block"><div class="pd-option-head"><span>Select Size</span><span class="pd-option-help">Required</span></div><div class="pd-options pd-sizes">' + sizes.map(function (size) { return '<button type="button" class="pd-size" data-size="' + esc(size) + '">' + esc(size) + '</button>'; }).join('') + '</div></div>';
    summary += '<div class="pd-stock ' + (soldOut ? 'out' : '') + '"><span class="pd-stock-dot"></span>' + (soldOut ? 'Currently out of stock' : (p._stock >= 999 ? 'In stock and ready to ship' : p._stock + ' available')) + '</div>';
    summary += '<div class="pd-purchase"><div class="pd-quantity" aria-label="Quantity"><button type="button" data-qty="-1" aria-label="Decrease quantity">−</button><span id="pdQty">1</span><button type="button" data-qty="1" aria-label="Increase quantity">+</button></div><button class="pd-add-cart" id="pdAddCart" type="button" ' + (soldOut ? 'disabled' : '') + '><i class="fa-solid fa-bag-shopping"></i>' + (soldOut ? 'Out of Stock' : 'Add to Cart') + '</button></div>';
    summary += '<div class="pd-assurance"><span><i class="fa-solid fa-box"></i> Carefully packed</span><span><i class="fa-solid fa-shield-halved"></i> Secure checkout</span></div></section>';
    d.getElementById("productDetail").innerHTML = gallery + summary;
    d.getElementById("productMessage").hidden = true;
    d.getElementById("productDetail").style.display = "grid";
    d.querySelectorAll('[data-image-index]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = Number(btn.getAttribute('data-image-index'));
        var main = d.getElementById('pdMainImage');
        if (main && currentImages[i]) main.src = imageUrl(currentImages[i], 1200);
        d.querySelectorAll('.pd-thumb').forEach(function (x) { x.classList.toggle('active', x === btn); });
      });
    });
    d.querySelectorAll('[data-size]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedSize = btn.getAttribute('data-size');
        d.querySelectorAll('[data-size]').forEach(function (x) { x.classList.toggle('active', x === btn); });
      });
    });
    d.querySelectorAll('[data-color]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedColor = btn.getAttribute('data-color');
        var lab = d.getElementById('pdSelectedColor'); if (lab) lab.textContent = selectedColor;
        d.querySelectorAll('[data-color]').forEach(function (x) { x.classList.toggle('active', x === btn); });
        var idx = colors.indexOf(selectedColor), main = d.getElementById('pdMainImage');
        if (main && currentImages[idx]) main.src = imageUrl(currentImages[idx], 1200);
        d.querySelectorAll('.pd-thumb').forEach(function (x, i) { x.classList.toggle('active', i === idx); });
      });
    });
    d.querySelectorAll('[data-qty]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedQty = Math.max(1, Math.min(10, selectedQty + Number(btn.getAttribute('data-qty'))));
        if (p._stock < 999) selectedQty = Math.min(selectedQty, Math.max(1, p._stock));
        var qty = d.getElementById('pdQty'); if (qty) qty.textContent = selectedQty;
      });
    });
    d.getElementById('pdAddCart').addEventListener('click', function () {
      if (!currentProduct || currentProduct._stock <= 0) return;
      if (sizes.length && !selectedSize) {
        SUB.notify('Please select a size before adding this product to your bag.', 'warning', 'Select a Size');
        var sizeBlock = d.querySelector('.pd-sizes'); if (sizeBlock) sizeBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      SUB.cart.add({ id: p.id, name: p.name, price: p._price, image: p._img || currentImages[0], qty: selectedQty, size: selectedSize, color: selectedColor });
      SUB.cart.render();
      SUB.notify(p.name + ' added to your bag.', 'success', 'Added to Cart');
    });
  }
  function renderRelated(product, allProducts) {
    var box = d.getElementById("pdRelated");
    if (!box) return;
    var same = allProducts.filter(function (x) { return x.id !== product.id && x.active !== false && x._stock > 0 && String(x.category || "").toLowerCase() === String(product.category || "").toLowerCase(); });
    var others = same.concat(allProducts.filter(function (x) { return x.id !== product.id && x.active !== false && x._stock > 0 && same.indexOf(x) < 0; }));
    var list = others.slice(0, 4);
    if (!list.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = '<div class="pd-related-heading"><div><span>MORE TO EXPLORE</span><h2>You may also like</h2></div><a href="shop.html">View all products <i class="fa-solid fa-arrow-right"></i></a></div><div class="pd-related-grid">' + list.map(function (x) {
      return '<article class="pd-related-card"><a href="product.html?id=' + encodeURIComponent(x.id) + '" class="pd-related-image"><img src="' + esc(imageUrl(x._img, 500)) + '" loading="lazy" alt="' + esc(x.name) + '"></a><div class="pd-related-info"><span>' + esc(x.category || 'Collection') + '</span><a class="pd-related-name" href="product.html?id=' + encodeURIComponent(x.id) + '">' + esc(x.name) + '</a><strong>' + SUB.money(x._price) + '</strong><div class="pd-related-actions"><button type="button" aria-label="Add ' + esc(x.name) + ' to bag" title="Add to bag" data-related-cart="' + esc(x.id) + '"><i class="fa-solid fa-bag-shopping"></i></button><a href="product.html?id=' + encodeURIComponent(x.id) + '">View <i class="fa-solid fa-arrow-right"></i></a></div></div></article>';
    }).join('') + '</div>';
    box.querySelectorAll('[data-related-cart]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-related-cart'), chosen = allProducts.filter(function (x) { return x.id === id; })[0];
        if (!chosen) return;
        if ((chosen.sizes || []).length || (chosen.colors || []).length) { w.location.href = 'product.html?id=' + encodeURIComponent(id); return; }
        SUB.cart.add({ id: chosen.id, name: chosen.name, price: chosen._price, image: chosen._img, qty: 1 });
        SUB.cart.render(); SUB.notify(chosen.name + ' added to your bag.', 'success', 'Added to Cart');
      });
    });
  }

  function init() {
    if (!w.SUB) return showMessage('The product service could not be started. Please refresh the page or return to the shop.');
    var id = SUB.qs('id');
    if (!id && SUB.qs('demo') === '1') {
      var demoName = SUB.qs('name') || 'Subeesha Product';
      var demoImage = SUB.qs('image') || SUB.url('assets/images/logo.jpg');
      var demo = { id: 'demo-' + SUB.slug(demoName), name: demoName, category: SUB.qs('category') || 'Collection', description: 'A thoughtfully selected item from the Subeesha collection.', images: [demoImage], sizes: [], colors: [], price: SUB.num(SUB.qs('price')), _price: SUB.num(SUB.qs('price')), _old: 0, _pct: 0, _img: demoImage, _stock: 999, rating: 0, active: true };
      w.__products = [demo]; render(demo); SUB.cart.render(); return;
    }
    if (!id) return showMessage('No product was selected. Please choose a product from the shop.');
    if (!SUB.configured) return showMessage('The product catalog is temporarily unavailable. Please check your Firebase configuration and try again.');
    SUB.getProduct(id).then(function (p) {
      if (!p || p.active === false) return showMessage('This product is no longer available. Please explore the shop for other products.');
      return SUB.catalog().then(function (catalog) {
        var allProducts = catalog.products || [];
        if (!allProducts.some(function (x) { return x.id === p.id; })) allProducts.unshift(p);
        w.__products = allProducts;
        render(p); renderRelated(p, allProducts); SUB.cart.render();
      });
    }).catch(function (e) {
      console.error('Product detail failed to load', e);
      showMessage('We could not load this product right now. Please refresh the page or return to the shop.');
    });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})(window, document);
