/* =========================================================
   RESELLER PANEL SHARED UI
   Business actions live in their dedicated Firebase modules:
   products.js owns order creation; withdraw.js owns payouts.
   ========================================================= */

(function (w, d) {
    "use strict";

    var menuToggle = d.getElementById("menuToggle");
    var sidebar = d.getElementById("sidebar");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", function () {
            sidebar.classList.toggle("show");
        });
    }

    var currentPage = w.location.pathname.split("/").pop() || "dashboard.html";
    d.querySelectorAll(".menu-item").forEach(function (item) {
        var itemPage = (item.getAttribute("href") || "").split("/").pop();
        item.classList.toggle("active", itemPage === currentPage);
        item.addEventListener("click", function () {
            if (w.innerWidth < 900 && sidebar) sidebar.classList.remove("show");
        });
    });

    w.showToast = function (message) {
        var toast = d.getElementById("toast");
        var toastMessage = d.getElementById("toastMessage");
        if (!toast || !toastMessage) return;
        toastMessage.textContent = String(message || "");
        toast.classList.add("show");
        w.setTimeout(function () { toast.classList.remove("show"); }, 3000);
    };

    w.scrollToSection = function (id) {
        var element = d.getElementById(id);
        if (element) element.scrollIntoView({ behavior: "smooth" });
    };

    w.goToPage = function (page) {
        w.location.href = page;
    };

    // This is a UI-only helper. The actual order submit handler is in products.js.
    w.closeOrderModal = function () {
        var modal = d.getElementById("orderModal");
        if (modal) modal.classList.remove("show");
        d.body.style.overflow = "";
        var form = d.getElementById("createOrderForm");
        if (form) form.reset();
    };

    var orderModal = d.getElementById("orderModal");
    if (orderModal) {
        orderModal.addEventListener("click", function (event) {
            if (event.target === orderModal) w.closeOrderModal();
        });
    }

    d.addEventListener("click", function (event) {
        if (
            sidebar &&
            menuToggle &&
            w.innerWidth < 900 &&
            sidebar.classList.contains("show") &&
            !sidebar.contains(event.target) &&
            !menuToggle.contains(event.target)
        ) {
            sidebar.classList.remove("show");
        }
    });
})(window, document);
