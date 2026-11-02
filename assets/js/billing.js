/* =========================================================
   SUBEESHA - MULTI-STEP CHECKOUT (billing.html)
   ?product=<id>  -> buy a single product
   ?cart=1        -> checkout everything in the cart

   FLOW:
   1. Product selection
   2. Customer + delivery location (map pin OR exact written address)
   3. Cash on Delivery + wallet
   4. Order review modal -> Confirm & Place Order
   ========================================================= */

const $ = id => document.getElementById(id)
const money = n => "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-US")

let items = []
let cartMode = false
let couponCode = ""
let couponDiscount = 0
let walletDiscount = 0
let shippingCfg = { charge: 250, freeAbove: 5000 }
let placing = false
let loc = null                 // Exact pinned location: { lat, lng, address, city, province }
let cityLoc = null             // City center fallback for delivery-zone calculation only
let currentStep = 1

/* ---------- TOAST ---------- */
function esc(value) {
    return SUB.esc(value == null ? "" : String(value))
}

function showToast(title, message, type = "success") {
    const container = $("toastContainer")
    if (!container) return

    let icon = "checkmark-circle-outline"
    if (type === "error") icon = "close-circle-outline"
    if (type === "warning") icon = "warning-outline"

    const toast = document.createElement("div")
    toast.className = "toast " + type
    toast.innerHTML = `
        <ion-icon class="toast-icon" name="${icon}"></ion-icon>
        <div class="toast-content">
            <strong>${esc(title)}</strong>
            <span>${esc(message)}</span>
        </div>
        <button class="toast-close" type="button" aria-label="Close notification">×</button>`

    toast.querySelector(".toast-close").addEventListener("click", () => removeToast(toast))
    container.appendChild(toast)

    setTimeout(() => {
        toast.classList.add("hide")
        setTimeout(() => toast.remove(), 350)
    }, 3500)
}

function removeToast(toast) {
    if (!toast) return
    toast.classList.add("hide")
    setTimeout(() => toast.remove(), 350)
}

/* ---------- HELPERS ---------- */
function subtotal() {
    return items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0)
}

function pinnedLocation() {
    if (!loc || !Number.isFinite(Number(loc.lat)) || !Number.isFinite(Number(loc.lng))) return null
    return {
        lat: Number(loc.lat),
        lng: Number(loc.lng),
        address: String(loc.address || "")
    }
}

function currentLoc() {
    const location = pinnedLocation() || cityLoc
    return location && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng))
        ? { lat: Number(location.lat), lng: Number(location.lng) }
        : null
}

function deliveryInfo() {
    const location = currentLoc()
    return SUB.deliveryInfo(subtotal(), shippingCfg, {
        city: $("city") ? $("city").value : "",
        lat: location && location.lat,
        lng: location && location.lng
    })
}

function shippingCost() {
    return Number(deliveryInfo().charge) || 0
}

function setText(id, value) {
    const element = $(id)
    if (element) element.textContent = value == null ? "" : String(value)
}

function cssColor(name) {
    const value = String(name || "").trim().toLowerCase()
    return window.CSS && CSS.supports("color", value) ? value : "#c9c9c9"
}

function getAmounts() {
    const sub = subtotal()
    const ship = shippingCost()
    const discount = Math.max(0, Math.min(Number(couponDiscount) || 0, sub + ship))
    const wallet = $("useWallet") && $("useWallet").checked
        ? Math.min(walletBalance(), Math.max(0, sub + ship - discount))
        : 0

    walletDiscount = wallet

    return {
        subtotal: sub,
        shipping: ship,
        discount,
        wallet,
        total: Math.max(0, sub + ship - discount - wallet)
    }
}

/* ---------- CHECKOUT STEP NAVIGATION ---------- */
function updateStepProgress(step) {
    document.querySelectorAll(".steps .step").forEach(stepElement => {
        const number = Number(stepElement.dataset.step)
        stepElement.classList.toggle("active", number === step)
        stepElement.classList.toggle("completed", number < step)
    })

    document.querySelectorAll(".steps .step-line").forEach((line, index) => {
        line.classList.toggle("active", index < step - 1)
    })
}

function goToStep(step) {
    const nextStep = Math.max(1, Math.min(3, Number(step) || 1))
    currentStep = nextStep

    document.querySelectorAll(".checkout-stage").forEach(stage => stage.classList.remove("active"))
    const stageId = nextStep === 1 ? "stageProduct" : nextStep === 2 ? "stageLocation" : "stagePayment"
    const stage = $(stageId)
    if (stage) stage.classList.add("active")

    updateStepProgress(nextStep)

    if (nextStep === 3) calculateTotal()
    window.scrollTo({ top: 0, behavior: "smooth" })
}

function nextToLocation() {
    if (!items.length) return showToast("No product", "Please select a product before continuing.", "error")
    if (items.some(item => Number(item.stock) <= 0)) return showToast("Out of stock", "One or more products are unavailable.", "error")
    goToStep(2)
}

function validateCustomerInformation() {
    const firstName = $("firstName").value.trim()
    const lastName = $("lastName").value.trim()
    const email = $("email").value.trim()
    const mobile = $("mobile").value.trim()

    if (!firstName || !lastName || !email || !mobile) {
        showToast("Required information", "Please complete your name, email and mobile number.", "error")
        return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast("Invalid email", "Please enter a valid email address.", "error")
        $("email").focus()
        return false
    }

    if (!/^[+\d][\d\s-]{8,}$/.test(mobile)) {
        showToast("Invalid mobile", "Please enter a valid mobile number.", "error")
        $("mobile").focus()
        return false
    }

    return true
}

function validateDeliveryLocation() {
    const province = $("province").value.trim()
    const city = $("city").value.trim()
    const address = $("address").value.trim()
    const pin = pinnedLocation()

    if (!province || !city) {
        showToast("Delivery location required", "Please select your province and city.", "error")
        return false
    }

    // A precise map pin OR a sufficiently complete manually entered address is mandatory.
    if (!pin && address.length < 10) {
        showToast("Exact location required", "Pin your exact location on the map OR enter your complete address (at least 10 characters).", "error")
        $("address").focus()
        return false
    }

    if (!$("area").value.trim() && !pin) {
        showToast("Area required", "Please enter your area, locality or sector for delivery.", "error")
        $("area").focus()
        return false
    }

    return true
}

function nextToPayment() {
    if (!validateCustomerInformation()) return
    if (!validateDeliveryLocation()) return
    goToStep(3)
}

/* ---------- SINGLE PRODUCT VIEW ---------- */
function renderSingle() {
    const item = items[0]
    const product = item.product || {}

    $("mainProductImage").src = SUB.img(item.image, 900)
    $("summaryImage").src = SUB.img(item.image, 300)
    setText("productName", item.name)
    setText("summaryName", item.name)
    setText("productPrice", money(item.price))

    const priceBox = document.querySelector(".product-info .price")
    if (priceBox) {
        const old = priceBox.querySelector(".old-price")
        const badge = priceBox.querySelector(".sale-badge")
        if (old) {
            old.textContent = money(item.old)
            old.style.display = item.old ? "" : "none"
        }
        if (badge) {
            badge.textContent = item.pct + "% OFF"
            badge.style.display = item.old ? "" : "none"
        }
    }

    const rating = document.querySelector(".product-info .rating")
    if (rating) {
        if (product.rating > 0) {
            rating.querySelector(".stars").textContent = SUB.stars(product.rating)
            rating.querySelector("span:not(.stars)").textContent = product.rating + (product.reviewCount ? " (" + product.reviewCount + " Reviews)" : "")
        } else {
            rating.style.display = "none"
        }
    }

    const stock = document.querySelector(".product-info .stock")
    if (stock) {
        const amount = Number(item.stock)
        stock.innerHTML = amount <= 0
            ? '<ion-icon name="close-circle"></ion-icon> Out of Stock'
            : '<ion-icon name="checkmark-circle"></ion-icon> ' + (amount < 999 && amount <= 10 ? "Only " + amount + " left" : "In Stock")
        if (amount <= 0) stock.style.color = "#c62828"
    }

    // Product colors
    const colors = product.colors || []
    const optionTitles = document.querySelectorAll("#stageProduct .option-title")
    const colorTitle = optionTitles[0]
    const colorBox = document.querySelector("#stageProduct .colors")

    if (colors.length) {
        colorBox.innerHTML = colors.map((color, index) => {
            const image = SUB.img((product.images || [])[index] || item.image, 900)
            return `<button class="color-option${index === 0 ? " active" : ""}" onclick="selectColor('${esc(color).replace(/'/g, "")}','${esc(image)}',this)" title="${esc(color)}" aria-label="${esc(color)}"><span class="color-inner" style="background:${esc(cssColor(color))}"></span></button>`
        }).join("")
        item.color = colors[0]
        setText("selectedColor", colors[0])
        setText("summaryColor", colors[0])
    } else {
        if (colorTitle) colorTitle.style.display = "none"
        if (colorBox) colorBox.style.display = "none"
        const summaryColor = $("summaryColor")
        if (summaryColor) summaryColor.parentElement.style.display = "none"
    }

    // Product sizes
    const sizes = product.sizes || []
    const sizeTitle = optionTitles[1]
    const sizeBox = document.querySelector("#stageProduct .sizes")

    if (sizes.length) {
        sizeBox.innerHTML = sizes.map((size, index) =>
            `<button class="size${index === 0 ? " active" : ""}" onclick="selectSize('${esc(size).replace(/'/g, "")}',this)">${esc(size)}</button>`
        ).join("")
        item.size = sizes[0]
        setText("selectedSize", sizes[0])
        setText("summarySize", sizes[0])
    } else {
        if (sizeTitle) sizeTitle.style.display = "none"
        if (sizeBox) sizeBox.style.display = "none"
        const summarySize = $("summarySize")
        if (summarySize) summarySize.parentElement.style.display = "none"
    }

    setText("quantity", item.qty)
    setText("summaryQty", item.qty)
    setText("summaryPrice", money(item.price * item.qty))
}

function selectColor(color, image, button) {
    if (!items[0]) return

    items[0].color = color
    setText("selectedColor", color)
    setText("summaryColor", color)

    document.querySelectorAll("#stageProduct .color-option").forEach(element => element.classList.remove("active"))
    if (button) button.classList.add("active")

    const mainImage = $("mainProductImage")
    mainImage.classList.add("change")
    setTimeout(() => {
        mainImage.src = image
        mainImage.classList.remove("change")
    }, 180)

    $("summaryImage").src = image
    renderSummaryProducts()
    showToast("Color selected", color + " color selected.", "success")
}

function selectSize(size, button) {
    if (!items[0]) return

    items[0].size = size
    setText("selectedSize", size)
    setText("summarySize", size)

    document.querySelectorAll("#stageProduct .size").forEach(element => element.classList.remove("active"))
    if (button) button.classList.add("active")

    renderSummaryProducts()
    showToast("Size selected", "Size " + size + " selected.", "success")
}

function changeQuantity(change) {
    const item = items[0]
    if (!item) return

    let quantity = item.qty + change
    if (quantity < 1) quantity = 1
    if (quantity > 10) {
        quantity = 10
        showToast("Quantity limit", "Maximum 10 items can be purchased.", "warning")
    }
    if (quantity > item.stock) {
        quantity = Math.max(1, item.stock)
        showToast("Stock limit", "Only " + item.stock + " item(s) are available.", "warning")
    }

    item.qty = quantity
    setText("quantity", quantity)
    setText("summaryQty", quantity)
    setText("summaryPrice", money(item.price * quantity))
    renderSummaryProducts()
    refreshCoupon().then(calculateTotal)
}

/* ---------- CART VIEW ---------- */
function renderCartLines() {
    const area = document.querySelector("#stageProduct .product-area")
    if (!area) return

    area.innerHTML = '<div id="cartLines" style="width:100%">' + items.map((item, index) => `
        <div class="cart-line" style="display:flex;gap:16px;align-items:center;padding:14px 0;border-bottom:1px solid #eee;flex-wrap:wrap">
            <img src="${esc(SUB.img(item.image, 200))}" alt="${esc(item.name)}" style="width:78px;height:78px;border-radius:4px;object-fit:cover">
            <div style="flex:1;min-width:140px">
                <strong style="display:block">${esc(item.name)}</strong>
                <span style="color:#68736e;font-size:13px">${money(item.price)} each${item.stock < 999 && item.stock <= 10 ? " · only " + item.stock + " left" : ""}</span>
                ${item.color ? `<span style="display:block;color:#68736e;font-size:12px">Color: ${esc(item.color)}</span>` : ""}
                ${item.size ? `<span style="display:block;color:#68736e;font-size:12px">Size: ${esc(item.size)}</span>` : ""}
            </div>
            <div class="quantity-box" style="margin:0">
                <button class="qty-btn" type="button" onclick="cartQty(${index},-1)">−</button>
                <span class="qty-number">${item.qty}</span>
                <button class="qty-btn" type="button" onclick="cartQty(${index},1)">+</button>
            </div>
            <strong style="min-width:90px;text-align:right">${money(item.price * item.qty)}</strong>
            <button class="toast-close" type="button" style="color:#c62828" onclick="cartRemove(${index})" aria-label="Remove">×</button>
        </div>`).join("") + "</div>"

    const heading = document.querySelector("#stageProduct .card-heading h2")
    const description = document.querySelector("#stageProduct .card-heading p")
    if (heading) heading.textContent = "Your Cart"
    if (description) description.textContent = items.length + " item(s) ready for checkout"
}

function cartQty(index, delta) {
    const item = items[index]
    if (!item) return

    const quantity = item.qty + delta
    if (quantity > 10) return showToast("Quantity limit", "Maximum 10 items per product.", "warning")
    if (quantity > item.stock) return showToast("Stock limit", "Only " + item.stock + " item(s) are available.", "warning")
    if (quantity < 1) return cartRemove(index)

    item.qty = quantity
    syncCart()
    renderCartLines()
    renderSummaryProducts()
    refreshCoupon().then(calculateTotal)
}

function cartRemove(index) {
    items.splice(index, 1)
    syncCart()

    if (!items.length) {
        location.href = SUB.url("page/shop.html")
        return
    }

    renderCartLines()
    renderSummaryProducts()
    refreshCoupon().then(calculateTotal)
}

function syncCart() {
    SUB.cart.save(items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        qty: item.qty,
        color: item.color || "",
        size: item.size || ""
    })))
}

/* ---------- SUMMARY ---------- */
function renderSummaryProducts() {
    const first = document.querySelector(".summary-product")
    if (!first) return

    let box = $("summaryList")
    if (!box) {
        box = document.createElement("div")
        box.id = "summaryList"
        first.parentNode.insertBefore(box, first)
        first.style.display = "none"
    }

    box.innerHTML = items.map(item => `
        <div class="summary-product">
            <img src="${esc(SUB.img(item.image, 300))}" alt="${esc(item.name)}">
            <div class="summary-product-info">
                <strong>${esc(item.name)}</strong>
                ${item.color ? `<span>Color: <b>${esc(item.color)}</b></span>` : ""}
                ${item.size ? `<span>Size: <b>${esc(item.size)}</b></span>` : ""}
                <span>Qty: <b>${item.qty}</b></span>
            </div>
            <div class="summary-price">${money(item.price * item.qty)}</div>
        </div>`).join("")
}

/* ---------- COUPON ---------- */
function refreshCoupon() {
    if (!couponCode) {
        couponDiscount = 0
        return Promise.resolve()
    }

    return SUB.checkCoupon(couponCode, subtotal())
        .then(result => { couponDiscount = Number(result.amount) || 0 })
        .catch(() => {
            couponDiscount = 0
            couponCode = ""
            if ($("coupon")) $("coupon").value = ""
        })
}

function applyCoupon() {
    const code = $("coupon").value.trim().toUpperCase()
    if (!code) return showToast("Promo code", "Please enter a promo code.", "warning")
    if (!SUB.configured) return showToast("Store unavailable", "Store is not connected yet.", "error")
    if (!SUB.user) return showToast("Login required", "Please login to use a promo code.", "warning")

    SUB.checkCoupon(code, subtotal()).then(result => {
        couponCode = result.code
        couponDiscount = Number(result.amount) || 0
        showToast("Coupon applied", result.label + " applied successfully.", "success")
        calculateTotal()
    }).catch(error => {
        couponCode = ""
        couponDiscount = 0
        calculateTotal()
        showToast("Invalid coupon", error.message || "Invalid promo code.", "error")
    })
}

/* ---------- WALLET ---------- */
function walletBalance() {
    return SUB.profile ? Number(SUB.profile.wallet) || 0 : 0
}

function toggleWallet() {
    const checkbox = $("useWallet")
    if (checkbox.checked && walletBalance() <= 0) {
        checkbox.checked = false
        return showToast("Wallet unavailable", "You have no wallet balance.", "warning")
    }

    showToast(
        checkbox.checked ? "Wallet applied" : "Wallet removed",
        checkbox.checked ? "Wallet balance applied to this order." : "Wallet balance removed.",
        checkbox.checked ? "success" : "warning"
    )
    calculateTotal()
}

/* ---------- TOTALS ---------- */
function calculateTotal() {
    const amounts = getAmounts()

    if (!cartMode && items[0]) setText("productPrice", money(items[0].price))
    setText("summaryPrice", money(amounts.subtotal))
    setText("subtotal", money(amounts.subtotal))
    setText("shipping", amounts.shipping === 0 ? "Free" : money(amounts.shipping))
    setText("discount", "- " + money(amounts.discount))
    setText("walletDiscount", "- " + money(amounts.wallet))
    setText("total", money(amounts.total))
    updateLocText()
}

/* ---------- PAYMENT (COD ONLY FOR NOW) ---------- */
function selectPayment(element) {
    document.querySelectorAll(".payment").forEach(payment => {
        payment.classList.remove("selected")
        const radio = payment.querySelector(".payment-radio")
        if (radio) radio.checked = false
    })

    if (!element) return
    element.classList.add("selected")
    const radio = element.querySelector(".payment-radio")
    if (radio) radio.checked = true
}

function currentPayment() {
    return "Cash on Delivery"
}

function setupPayments() {
    // Only COD is intentionally enabled in this checkout version.
    document.querySelectorAll(".payment").forEach(payment => {
        const name = payment.querySelector(".payment-info strong")?.textContent.trim()
        if (name !== "Cash on Delivery") payment.remove()
    })

    const cod = document.querySelector(".payment")
    if (cod) selectPayment(cod)
}

/* ---------- CUSTOMER + ADDRESS ---------- */
function prefill(profile) {
    if (!profile) return

    const nameParts = String(profile.name || "").trim().split(/\s+/).filter(Boolean)
    if (!$ ("firstName").value) $("firstName").value = nameParts.shift() || ""
    if (!$ ("lastName").value) $("lastName").value = nameParts.join(" ")
    if (!$ ("email").value) $("email").value = profile.email || ""
    if (!$ ("mobile").value) $("mobile").value = String(profile.whatsapp || "").replace(/^\+92\s?/, "0")

    if (profile.location && Number.isFinite(Number(profile.location.lat)) && Number.isFinite(Number(profile.location.lng))) {
        loc = profile.location
    }

    const savedAddress = (profile.addresses || [])[0]
    if (savedAddress) {
        if (savedAddress.province) pickOption($("province"), savedAddress.province)
        if (savedAddress.city) pickOption($("city"), savedAddress.city)
        if (savedAddress.area && !$ ("area").value) $("area").value = savedAddress.area
        if (savedAddress.postal && !$ ("postal").value) $("postal").value = savedAddress.postal
        if (savedAddress.address && !$ ("address").value) $("address").value = savedAddress.address
    }

    updateLocText()
}

function pickOption(select, value) {
    if (!select || !value) return false

    const target = String(value).toLowerCase().trim()
    const option = Array.from(select.options).find(item => {
        if (!item.value) return false
        const label = item.text.toLowerCase().trim()
        return label === target || target.includes(label) || label.includes(target)
    })

    if (option) {
        select.value = option.value
        return true
    }
    return false
}

/* ---------- DELIVERY LOCATION / LEAFLET MAP ---------- */
function updateLocText() {
    const text = $("locText")
    if (!text) return

    const pin = pinnedLocation()
    const info = deliveryInfo()

    if (pin) {
        text.classList.remove("location-required")
        text.classList.add("pinned")
        text.textContent = "Location pinned: " + (pin.address || (pin.lat.toFixed(5) + ", " + pin.lng.toFixed(5))) + ". You can still edit the written address above."
    } else {
        text.classList.remove("pinned")
        text.classList.add("location-required")
        text.textContent = "Required: pin your exact location on the map OR enter your complete address manually (at least 10 characters)."
    }

    if (info.label && shippingCfg.mode !== "flat" && subtotal() > 0 && info.label !== "Free delivery") {
        text.textContent += " Delivery estimate: " + info.label + " — " + (info.charge ? money(info.charge) : "Free") + "."
    }
}

function setupLocation() {
    const pinButton = $("locBtn")
    const address = $("address")
    const city = $("city")

    if (pinButton && !pinButton.dataset.bound) {
        pinButton.dataset.bound = "1"
        pinButton.addEventListener("click", () => {
            if (!SUB.map || typeof SUB.map.pick !== "function") {
                showToast("Map unavailable", "The location map could not be loaded. Please enter your complete address manually.", "error")
                return
            }

            pinButton.disabled = true
            SUB.map.pick(loc).then(result => {
                if (!result) return
                if (!Number.isFinite(Number(result.lat)) || !Number.isFinite(Number(result.lng))) {
                    throw new Error("The selected map location is not valid. Please select the pin again.")
                }

                loc = result
                pickOption($("province"), result.province)
                pickOption($("city"), result.city)
                if (!address.value.trim() && result.address) address.value = result.address
                if (result.area && !$ ("area").value) $("area").value = result.area
                cityLoc = null
                calculateTotal()
                showToast("Location pinned", "Your delivery location has been selected.", "success")
            }).catch(error => {
                showToast("Location error", error.message || "Could not select your location.", "error")
            }).finally(() => {
                pinButton.disabled = false
            })
        })
    }

    if (city && !city.dataset.bound) {
        city.dataset.bound = "1"
        city.addEventListener("change", () => {
            cityLoc = null
            calculateTotal()

            // City coordinates are only a shipping-zone fallback, never saved as an exact pin.
            if (shippingCfg.mode === "zones" && !pinnedLocation() && city.value && SUB.map?.geocodeCity) {
                const selectedCity = city.value
                SUB.map.geocodeCity(selectedCity).then(result => {
                    if (result && city.value === selectedCity) {
                        cityLoc = result
                        calculateTotal()
                    }
                }).catch(() => {})
            }
        })
    }

    if (address && !address.dataset.bound) {
        address.dataset.bound = "1"
        address.addEventListener("input", updateLocText)
    }

    updateLocText()
}

/* ---------- ORDER REVIEW MODAL ---------- */
function reviewField(label, value, full = false) {
    return `<div class="review-field${full ? " full" : ""}"><small>${esc(label)}</small><strong>${esc(value || "—")}</strong></div>`
}

function renderOrderReview() {
    const container = $("orderReviewContent")
    if (!container) return

    const amounts = getAmounts()
    const address = $("address").value.trim() || (loc && loc.address) || "Exact map pin selected"
    const deliveryType = pinnedLocation() ? "Exact map location pinned" : "Manually entered address"
    const itemMarkup = items.map(item => `
        <div class="review-item">
            <img src="${esc(SUB.img(item.image, 200))}" alt="${esc(item.name)}">
            <div class="review-item-info">
                <strong>${esc(item.name)}</strong>
                <span>${item.color ? "Color: " + esc(item.color) + " · " : ""}${item.size ? "Size: " + esc(item.size) + " · " : ""}Qty: ${item.qty}</span>
            </div>
            <div class="review-item-price">${money(item.price * item.qty)}</div>
        </div>`).join("")

    const pin = pinnedLocation()
    const pinText = pin
        ? (pin.address || (pin.lat.toFixed(6) + ", " + pin.lng.toFixed(6)))
        : "No map pin — manual address will be used"

    container.innerHTML = `
        <section class="review-block">
            <h3 class="review-block-title"><ion-icon name="bag-handle-outline"></ion-icon> Products</h3>
            <div class="review-items">${itemMarkup}</div>
        </section>

        <section class="review-block">
            <h3 class="review-block-title"><ion-icon name="person-outline"></ion-icon> Customer Information</h3>
            <div class="review-grid">
                ${reviewField("Customer name", $("firstName").value.trim() + " " + $("lastName").value.trim())}
                ${reviewField("Mobile number", $("mobile").value.trim())}
                ${reviewField("Email address", $("email").value.trim(), true)}
            </div>
        </section>

        <section class="review-block">
            <h3 class="review-block-title"><ion-icon name="location-outline"></ion-icon> Delivery Address</h3>
            <div class="review-grid">
                ${reviewField("Province", $("province").value)}
                ${reviewField("City", $("city").value)}
                ${reviewField("Area / Zone", $("area").value.trim())}
                ${reviewField("Postal code", $("postal").value.trim())}
                ${reviewField("Complete address", address, true)}
                ${reviewField("Location method", deliveryType)}
                ${reviewField("Map pin", pinText, true)}
            </div>
        </section>

        <section class="review-block">
            <h3 class="review-block-title"><ion-icon name="card-outline"></ion-icon> Payment Method</h3>
            <div class="review-grid">${reviewField("Payment", currentPayment())}</div>
        </section>

        <section class="review-block">
            <h3 class="review-block-title"><ion-icon name="receipt-outline"></ion-icon> Price Details</h3>
            <div class="review-total-row"><span>Subtotal</span><strong>${money(amounts.subtotal)}</strong></div>
            <div class="review-total-row"><span>Shipping</span><strong>${amounts.shipping === 0 ? "Free" : money(amounts.shipping)}</strong></div>
            <div class="review-total-row"><span>Coupon discount${couponCode ? " (" + esc(couponCode) + ")" : ""}</span><strong class="negative">- ${money(amounts.discount)}</strong></div>
            <div class="review-total-row"><span>Wallet discount</span><strong class="negative">- ${money(amounts.wallet)}</strong></div>
            <div class="review-total-row final"><span>Grand Total</span><strong>${money(amounts.total)}</strong></div>
        </section>`
}

function openReviewModal() {
    renderOrderReview()
    const modal = $("orderReviewModal")
    if (!modal) return

    modal.classList.add("open")
    modal.setAttribute("aria-hidden", "false")
    document.body.classList.add("review-open")
    updateStepProgress(4)
    const closeButton = modal.querySelector(".review-close")
    if (closeButton) closeButton.focus()
}

function closeReviewModal() {
    if (placing) return
    const modal = $("orderReviewModal")
    if (!modal) return

    modal.classList.remove("open")
    modal.setAttribute("aria-hidden", "true")
    document.body.classList.remove("review-open")
    updateStepProgress(currentStep)
}

/* ---------- REVIEW ORDER (DOES NOT SUBMIT) ---------- */
function placeOrder() {
    if (placing) return
    if (!items.length) return showToast("No product", "No product selected.", "error")
    if (!validateCustomerInformation() || !validateDeliveryLocation()) {
        goToStep(2)
        return
    }
    if (!SUB.configured) return showToast("Store unavailable", "Store is not connected to Firebase yet.", "error")
    if (!SUB.user) {
        showToast("Login required", "Please login to review and place your order.", "warning")
        setTimeout(() => {
            location.href = SUB.url("account.html?next=" + encodeURIComponent("page/billing.html" + location.search))
        }, 900)
        return
    }

    openReviewModal()
}

/* ---------- FINAL CONFIRMATION (ACTUALLY SUBMITS) ---------- */
function confirmPlaceOrder() {
    if (placing) return
    if (!items.length) return showToast("No product", "No product selected.", "error")
    if (!validateCustomerInformation() || !validateDeliveryLocation()) {
        closeReviewModal()
        goToStep(2)
        return
    }
    if (!SUB.configured) return showToast("Store unavailable", "Store is not connected to Firebase yet.", "error")
    if (!SUB.user) {
        closeReviewModal()
        showToast("Login required", "Please login to place your order.", "warning")
        setTimeout(() => {
            location.href = SUB.url("account.html?next=" + encodeURIComponent("page/billing.html" + location.search))
        }, 900)
        return
    }

    const button = $("confirmOrderBtn")
    placing = true
    if (button) {
        button.disabled = true
        button.innerHTML = '<ion-icon name="sync-outline"></ion-icon> Placing Order...'
    }

    const customerAddress = $("address").value.trim() || (loc && loc.address) || "Exact map location selected"
    const mapPin = pinnedLocation()

    SUB.placeOrder({
        items: items.map(item => ({
            id: item.id,
            qty: item.qty,
            color: item.color || "",
            size: item.size || ""
        })),
        customer: {
            name: $("firstName").value.trim() + " " + $("lastName").value.trim(),
            email: $("email").value.trim(),
            phone: $("mobile").value.trim(),
            province: $("province").value,
            city: $("city").value,
            area: $("area").value.trim(),
            postal: $("postal").value.trim(),
            address: customerAddress
        },
        paymentMethod: "Cash on Delivery",
        paymentRef: "",
        coupon: couponCode,
        useWallet: $("useWallet").checked,
        source: "web",
        resellerCode: SUB.refCode(),
        location: mapPin ? { lat: mapPin.lat, lng: mapPin.lng } : null
    }).then(order => {
        if (cartMode) SUB.cart.clear()

        if (button) button.innerHTML = '<ion-icon name="checkmark-circle-outline"></ion-icon> Order Placed'
        showToast("Order placed", "Your order " + order.orderNo + " has been placed successfully.", "success")

        setTimeout(() => {
            location.href = SUB.url("page/profile.html#orders")
        }, 1400)
    }).catch(error => {
        placing = false
        if (button) {
            button.disabled = false
            button.innerHTML = '<ion-icon name="checkmark-circle-outline"></ion-icon> Confirm &amp; Place Order'
        }
        showToast("Order failed", (error && error.message) || "Could not place the order. Please try again.", "error")
    })
}

/* ---------- INIT HELPERS ---------- */
function emptyState(message) {
    const area = document.querySelector("#stageProduct .product-area")
    if (area) {
        area.innerHTML = `
            <div style="text-align:center;width:100%;padding:40px 10px">
                <ion-icon name="bag-handle-outline" style="font-size:54px;color:var(--primary)"></ion-icon>
                <h3 style="margin:10px 0">${esc(message)}</h3>
                <a href="${SUB.url("page/shop.html")}" class="place-order" style="display:inline-flex;text-decoration:none;width:auto;padding:12px 26px">Continue Shopping</a>
            </div>`
    }

    const actions = document.querySelector("#stageProduct .checkout-actions")
    if (actions) actions.style.display = "none"
    calculateTotal()
}

function lineFrom(product, quantity, extra) {
    return Object.assign({
        id: product.id,
        name: product.name,
        price: product._price,
        old: product._old,
        pct: product._pct,
        image: product._img,
        qty: quantity || 1,
        stock: product._stock,
        color: "",
        size: "",
        product
    }, extra || {})
}

async function initCheckout() {
    cartMode = SUB.qs("cart") === "1"
    if ($("useWallet")) $("useWallet").checked = false
    setupPayments()
    setupLocation()

    if (!SUB.configured) {
        calculateTotal()
        return
    }

    const [catalog, shipping] = await Promise.all([
        SUB.catalog(),
        SUB.settings("shipping")
    ])

    shippingCfg = shipping || shippingCfg

    if (cartMode) {
        const saved = SUB.cart.get()
        items = []

        saved.forEach(savedItem => {
            const product = catalog.products.find(item => item.id === savedItem.id)
            if (product && product._stock > 0) {
                items.push(lineFrom(product, Math.min(savedItem.qty, product._stock, 10), {
                    color: savedItem.color,
                    size: savedItem.size
                }))
            }
        })

        if (!items.length) return emptyState("Your cart is empty")
        syncCart()
        renderCartLines()
    } else {
        const productId = SUB.qs("product")
        let product = productId ? catalog.products.find(item => item.id === productId) : null
        if (productId && !product) product = await SUB.getProduct(productId).catch(() => null)
        if (!product) return emptyState("Product not found")

        const quantity = Math.max(1, Math.min(10, parseInt(SUB.qs("qty"), 10) || 1))
        items = [lineFrom(product, Math.min(quantity, Math.max(1, product._stock)))]
        renderSingle()

        if (product._stock <= 0) {
            const nextButton = document.querySelector("#stageProduct .checkout-btn")
            if (nextButton) nextButton.disabled = true
            showToast("Out of stock", product.name + " is currently unavailable.", "warning")
        }
    }

    renderSummaryProducts()

    SUB.onAuth((user, profile) => {
        prefill(profile)
        const balance = walletBalance()
        const walletPrice = document.querySelector(".wallet-price")
        if (walletPrice) walletPrice.textContent = money(balance)
        const walletLabel = document.querySelector(".wallet-use")
        if (walletLabel) walletLabel.style.opacity = balance > 0 ? "" : ".55"
        calculateTotal()
    })

    calculateTotal()
    goToStep(1)
}

function runInit() {
    initCheckout()
        .catch(error => {
            console.error("Checkout initialization failed:", error)
            showToast("Checkout error", error.message || "Could not load checkout details.", "error")
        })
        .finally(() => document.body.classList.remove("bk-loading"))

    setTimeout(() => document.body.classList.remove("bk-loading"), 10000)
}

// Close the confirmation modal when the backdrop or Escape key is used.
document.addEventListener("click", event => {
    if (event.target === $("orderReviewModal")) closeReviewModal()
})

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && $("orderReviewModal")?.classList.contains("open")) closeReviewModal()
})

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runInit)
} else {
    runInit()
}
