(function (w, d) {
    "use strict";

    var $ = function (id) { return d.getElementById(id); };
    var activePurchase = null;
    var activeRating = 0;
    var selectedImage = null;
    var myPurchases = [];
    var existingReviews = {};
    var submitBusy = false;
    var toastTimer = null;

    function esc(value) { return SUB.esc(value == null ? "" : value); }
    function imageUrl(value, width) { return value ? SUB.img(value, width || 300) : SUB.url("assets/images/logo.jpg"); }
    function reviewKey(orderId, productId) { return String(orderId) + "__" + String(productId); }
    function reviewDocId(orderId, productId) {
        return "rv_" + SUB.user.uid + "_" + orderId + "_" + productId;
    }
    function showToast(message, isError) {
        var toast = $("reviewToast");
        toast.textContent = message;
        toast.classList.toggle("error", !!isError);
        toast.classList.add("show");
        w.clearTimeout(toastTimer);
        toastTimer = w.setTimeout(function () { toast.classList.remove("show"); }, 3800);
    }
    function stateCard(icon, title, text) {
        return '<div class="rv-state-card"><i class="' + icon + '"></i><strong>' + esc(title) + '</strong><p>' + esc(text) + '</p></div>';
    }
    function dateText(value) { return SUB.date(value); }

    function renderPurchases() {
        var box = $("eligibleProducts");
        if (!myPurchases.length) {
            box.innerHTML = stateCard("fa-regular fa-face-smile", "No delivered products yet", "When an order is marked Delivered, its products will appear here and you can review each product from this page.");
            return;
        }

        box.innerHTML = myPurchases.map(function (entry) {
            var review = existingReviews[reviewKey(entry.order.id, entry.item.id)];
            var action = review
                ? '<button class="rv-write-button" type="button" disabled><i class="fa-solid fa-check"></i> ' + (review.status === "approved" ? "Reviewed" : review.status === "rejected" ? "Review Rejected" : "Under Review") + '</button>'
                : '<button class="rv-write-button" type="button" data-order="' + esc(entry.order.id) + '" data-product="' + esc(entry.item.id) + '"><i class="fa-regular fa-pen-to-square"></i> Write Review</button>';
            return '<article class="rv-purchase-card">' +
                '<div class="rv-purchase-top"><img class="rv-purchase-image" src="' + esc(imageUrl(entry.item.image, 260)) + '" alt="' + esc(entry.item.name) + '" onerror="this.onerror=null;this.src=\'' + esc(SUB.url("assets/images/logo.jpg")) + '\'">' +
                '<div class="rv-purchase-info"><h3>' + esc(entry.item.name || "Product") + '</h3><div class="rv-order-meta">Order #' + esc(entry.order.orderNo || entry.order.id) + '<br>Quantity: ' + esc(entry.item.qty || 1) + (entry.item.color ? '<br>Color: ' + esc(entry.item.color) : '') + (entry.item.size ? '<br>Size: ' + esc(entry.item.size) : '') + '</div><span class="rv-delivered-badge"><i class="fa-solid fa-circle-check"></i> Delivered · ' + esc(dateText(entry.deliveredAt)) + '</span></div></div>' +
                '<div class="rv-purchase-bottom"><small>' + (review ? (review.status === "approved" ? "Your review is published" : "Your review was submitted") : "Share your product experience") + '</small>' + action + '</div></article>';
        }).join("");
    }

    function renderPublicReviews(list) {
        var box = $("publicReviews");
        var total = list.length;
        if (!total) {
            $("averageRating").textContent = "0.0";
            $("averageStars").textContent = "☆☆☆☆☆";
            $("reviewCount").textContent = "No published reviews yet";
            box.innerHTML = stateCard("fa-regular fa-comments", "Be the first to share feedback", "Approved customer reviews will appear here and on their respective product detail pages.");
            return;
        }
        var avg = list.reduce(function (sum, item) { return sum + Number(item.rating || 0); }, 0) / total;
        $("averageRating").textContent = avg.toFixed(1);
        $("averageStars").textContent = SUB.stars(Math.round(avg));
        $("reviewCount").textContent = total + " published review" + (total === 1 ? "" : "s");
        box.innerHTML = list.slice(0, 12).map(function (review) {
            return '<article class="rv-review-card"><div class="rv-review-head"><div class="rv-review-person"><span class="rv-review-avatar"><i class="fa-solid fa-user"></i></span><span><strong>' + esc(review.name || "Subeesha Customer") + '</strong><small>' + esc(dateText(review.createdAt)) + '</small></span></div><span class="rv-verified"><i class="fa-solid fa-circle-check"></i> Verified</span></div>' +
                '<div class="rv-review-stars">' + esc(SUB.stars(review.rating)) + '</div><div class="rv-review-product">' + esc(review.product || "Purchased product") + '</div><p class="rv-review-text">' + esc(review.review || "") + '</p>' +
                (review.image ? '<img class="rv-review-photo" src="' + esc(imageUrl(review.image, 600)) + '" alt="Customer review photo" loading="lazy">' : '') +
                '<small class="rv-review-date">Verified purchase · Order #' + esc(review.orderNo || review.orderId || "-") + '</small></article>';
        }).join("");
    }

    function loadPublicReviews() {
        return SUB.db.collection("reviews").where("status", "==", "approved").get().then(function (snapshot) {
            var list = SUB.docs(snapshot).sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); });
            renderPublicReviews(list);
        }).catch(function (error) {
            console.warn("Public reviews could not be loaded", error);
            $("publicReviews").innerHTML = stateCard("fa-solid fa-triangle-exclamation", "Reviews could not be loaded", "Please refresh the page or try again later.");
        });
    }

    function deliveredDate(order) {
        var history = (order.statusHistory || []).filter(function (step) { return step.status === "Delivered"; });
        if (history.length) return history[history.length - 1].at;
        return order.updatedAt || order.createdAt;
    }

    function loadMyPurchases() {
        return Promise.all([
            SUB.db.collection("orders").where("userId", "==", SUB.user.uid).get(),
            SUB.db.collection("reviews").where("uid", "==", SUB.user.uid).get()
        ]).then(function (results) {
            existingReviews = {};
            SUB.docs(results[1]).forEach(function (review) {
                if (review.orderId && review.productId) existingReviews[reviewKey(review.orderId, review.productId)] = review;
            });

            myPurchases = [];
            SUB.docs(results[0]).filter(function (order) { return order.status === "Delivered"; })
                .sort(function (a, b) { return SUB.ms(deliveredDate(b)) - SUB.ms(deliveredDate(a)); })
                .forEach(function (order) {
                    var unique = {};
                    (order.items || []).forEach(function (item) {
                        if (!item.id || unique[item.id]) return;
                        unique[item.id] = true;
                        myPurchases.push({ order: order, item: item, deliveredAt: deliveredDate(order) });
                    });
                });
            renderPurchases();

            var orderId = new URLSearchParams(w.location.search).get("order");
            var productId = new URLSearchParams(w.location.search).get("product");
            if (orderId && productId) {
                var target = myPurchases.filter(function (entry) { return entry.order.id === orderId && entry.item.id === productId; })[0];
                if (target && !existingReviews[reviewKey(orderId, productId)]) {
                    w.setTimeout(function () { openReview(target); }, 250);
                }
            }
        }).catch(function (error) {
            console.error("Delivered orders could not be loaded", error);
            $("eligibleProducts").innerHTML = stateCard("fa-solid fa-triangle-exclamation", "Could not load your orders", "Please sign in again or refresh the page. If this continues, contact Subeesha support.");
        });
    }

    function updateStars() {
        [].forEach.call($("starPicker").querySelectorAll("button"), function (button) {
            var value = Number(button.getAttribute("data-star"));
            button.classList.toggle("active", value <= activeRating);
            button.setAttribute("aria-pressed", value === activeRating ? "true" : "false");
        });
        $("ratingValue").value = String(activeRating);
    }

    function openReview(entry) {
        activePurchase = entry;
        activeRating = 0;
        selectedImage = null;
        $("reviewForm").reset();
        $("reviewImagePreview").src = "";
        $("reviewImagePreview").style.display = "none";
        $("reviewCustomerName").textContent = (SUB.profile && SUB.profile.name) || (entry.order.customer && entry.order.customer.name) || "Customer";
        $("reviewCustomerEmail").textContent = (SUB.profile && SUB.profile.email) || (entry.order.customer && entry.order.customer.email) || "-";
        $("reviewProductInfo").innerHTML = '<img src="' + esc(imageUrl(entry.item.image, 250)) + '" alt="' + esc(entry.item.name) + '"><span><strong>' + esc(entry.item.name || "Product") + '</strong><small>Order #' + esc(entry.order.orderNo || entry.order.id) + ' · Qty ' + esc(entry.item.qty || 1) + '</small></span>';
        updateStars();
        $("reviewModal").classList.add("open");
        $("reviewModal").setAttribute("aria-hidden", "false");
        d.body.style.overflow = "hidden";
    }

    function closeReview() {
        $("reviewModal").classList.remove("open");
        $("reviewModal").setAttribute("aria-hidden", "true");
        d.body.style.overflow = "";
        activePurchase = null;
        selectedImage = null;
    }

    function normalizePurchasedItem(item) {
        // Keep the exact order item map so Firestore rules can verify it exists on the delivered order.
        return Object.assign({}, item);
    }

    function submitReview(event) {
        event.preventDefault();
        if (submitBusy) return;
        if (!activePurchase || !SUB.user || !SUB.profile) return showToast("Please sign in again before submitting your review.", true);
        var comment = $("reviewText").value.trim();
        if (activeRating < 1 || activeRating > 5) return showToast("Please select a star rating.", true);
        if (comment.length < 5) return showToast("Please write at least 5 characters about the product.", true);

        var entry = activePurchase;
        var id = reviewDocId(entry.order.id, entry.item.id);
        var name = (SUB.profile.name || (entry.order.customer && entry.order.customer.name) || "Customer").trim();
        var email = (SUB.profile.email || (entry.order.customer && entry.order.customer.email) || "").trim();
        var purchasedItem = normalizePurchasedItem(entry.item);
        var data = {
            uid: SUB.user.uid,
            name: name,
            email: email,
            orderId: entry.order.id,
            orderNo: entry.order.orderNo || entry.order.id,
            productId: entry.item.id,
            product: entry.item.name || "Product",
            productImage: entry.item.image || "",
            purchasedItem: purchasedItem,
            rating: activeRating,
            review: comment,
            image: null,
            status: "pending",
            createdAt: SUB.now()
        };

        submitBusy = true;
        var submit = $("reviewForm").querySelector("[type=submit]");
        submit.disabled = true;
        submit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

        var uploadPromise = selectedImage ? SUB.cloud.upload(selectedImage, { folder: "reviews" }) : Promise.resolve(null);
        uploadPromise.then(function (uploaded) {
            if (uploaded) data.image = uploaded.url;
            return SUB.db.collection("reviews").doc(id).set(data);
        }).then(function () {
            closeReview();
            showToast("Your review has been submitted and is awaiting verification.");
            return Promise.all([loadMyPurchases(), loadPublicReviews()]);
        }).catch(function (error) {
            console.error("Review submission failed", error);
            var message = error && error.code === "permission-denied"
                ? "This product can only be reviewed by the account that placed its delivered order."
                : (error.message || "Could not submit your review. Please try again.");
            showToast(message, true);
        }).finally(function () {
            submitBusy = false;
            submit.disabled = false;
            submit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Review';
        });
    }

    function bindEvents() {
        $("eligibleProducts").addEventListener("click", function (event) {
            var button = event.target.closest("[data-order][data-product]");
            if (!button) return;
            var entry = myPurchases.filter(function (item) {
                return item.order.id === button.getAttribute("data-order") && item.item.id === button.getAttribute("data-product");
            })[0];
            if (entry) openReview(entry);
        });
        $("starPicker").addEventListener("click", function (event) {
            var button = event.target.closest("[data-star]");
            if (!button) return;
            activeRating = Number(button.getAttribute("data-star"));
            updateStars();
        });
        $("reviewImage").addEventListener("change", function () {
            var file = this.files && this.files[0];
            selectedImage = null;
            if (!file) return;
            if (["image/jpeg", "image/png", "image/webp"].indexOf(file.type) < 0 || file.size > 5 * 1024 * 1024) {
                this.value = "";
                return showToast("Choose a JPG, PNG or WEBP image under 5 MB.", true);
            }
            selectedImage = file;
            var reader = new FileReader();
            reader.onload = function (e) {
                $("reviewImagePreview").src = e.target.result;
                $("reviewImagePreview").style.display = "block";
            };
            reader.readAsDataURL(file);
        });
        $("reviewForm").addEventListener("submit", submitReview);
        d.querySelectorAll("[data-close-review]").forEach(function (node) { node.addEventListener("click", closeReview); });
        d.addEventListener("keydown", function (event) { if (event.key === "Escape") closeReview(); });
    }

    function init() {
        if (!SUB.configured) {
            $("eligibleProducts").innerHTML = stateCard("fa-solid fa-plug", "Store connection required", "Connect this page to the Subeesha Firebase project to load delivered purchases.");
            return;
        }
        SUB.ready.then(function (auth) {
            if (!auth.user || !auth.profile) {
                w.location.href = SUB.url("account.html?next=" + encodeURIComponent("page/customer-love.html" + w.location.search));
                return;
            }
            if (auth.profile.role !== "customer") {
                $("eligibleProducts").innerHTML = stateCard("fa-solid fa-user-check", "Customer account required", "Product reviews are available to customers who placed and received their orders.");
                return loadPublicReviews();
            }
            $("reviewUserName").textContent = auth.profile.name || "Subeesha Customer";
            $("reviewUserEmail").textContent = auth.profile.email || "";
            $("reviewCustomerName").textContent = auth.profile.name || "Customer";
            $("reviewCustomerEmail").textContent = auth.profile.email || "-";
            bindEvents();
            return Promise.all([loadMyPurchases(), loadPublicReviews()]);
        }).catch(function (error) {
            console.error("Review page initialization failed", error);
            $("eligibleProducts").innerHTML = stateCard("fa-solid fa-triangle-exclamation", "Something went wrong", "Please refresh the page and try again.");
        });
    }

    init();
})(window, document);
