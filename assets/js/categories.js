
/* ================= MOBILE MENU ================= */

function toggleMenu() {
    const nav = document.getElementById("navLinks")

    if (!nav) return

    nav.classList.toggle("show")
}


/* ================= CATEGORY FILTER ================= */

function filterCategories(category, button) {

    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.classList.remove("active")
    })

    if (button) {
        button.classList.add("active")
    }

    document.querySelectorAll(".category-card").forEach(card => {

        const shouldShow =
            category === "all" ||
            card.dataset.category === category

        card.hidden = !shouldShow
    })
}


/* ================= SEARCH ================= */

function searchProduct() {

    const input = document.getElementById("searchInput")

    if (!input) return

    const query = input.value.trim()

    if (!query) {
        showToast("Please enter a product name")
        return
    }

    showToast('Searching for "' + query + '"')
}


/* ================= NEWSLETTER ================= */

function subscribe(event) {

    event.preventDefault()

    showToast("Thank you for subscribing to Subeesha!")

    event.target.reset()
}


/* ================= TOAST ================= */

let toastTimer

function showToast(message) {

    const toast = document.getElementById("toast")
    const toastText = document.getElementById("toastText")

    if (!toast || !toastText) return

    toastText.textContent = message

    toast.classList.add("show")

    clearTimeout(toastTimer)

    toastTimer = setTimeout(() => {
        toast.classList.remove("show")
    }, 3000)
}


/* ================= INITIAL CATEGORY STATE ================= */

function hideCategoriesInitially() {

    document.querySelectorAll(".category-card").forEach(card => {
        card.hidden = true
    })

    document.querySelectorAll(".filter-btn").forEach(button => {
        button.classList.remove("active")
    })
}


/* ================= PAGE SHIMMER LOADER ================= */

function initCategoriesPage() {

    hideCategoriesInitially()

    const loader = document.getElementById("categoriesLoader")

    if (!loader) {
        document.body.classList.remove("categories-loading")
        return
    }

    const startTime = Date.now()
    let isFinished = false

    function hideLoader() {

        if (isFinished) return

        isFinished = true

        // Minimum loader display time: 900ms
        const remaining = Math.max(
            0,
            900 - (Date.now() - startTime)
        )

        setTimeout(() => {

            document.body.classList.remove("categories-loading")

            loader.classList.add("is-hidden")

            setTimeout(() => {
                loader.remove()
            }, 300)

        }, remaining)
    }

    // Wait for page assets and images to load
    window.addEventListener("load", hideLoader, { once: true })

    // Handle cases where page is already loaded
    if (document.readyState === "complete") {
        hideLoader()
    }

    // Fallback in case an external resource takes too long
    setTimeout(hideLoader, 8000)
}


/* ================= INITIALIZATION ================= */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initCategoriesPage,
        { once: true }
    )

} else {

    initCategoriesPage()

}
