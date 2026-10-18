/* =========================================================
   SUBEESHA - MAIN JAVASCRIPT
   Homepage interactions. Data comes from Firebase via
   assets/js/sub-core.js + assets/js/store.js
   ========================================================= */

/* ===== IMAGE UPLOAD FORMATS (shared with the Admin Panel) ===== */
const SUPPORTED_IMAGE_TYPES = [
    "image/png", "image/jpeg", "image/webp", "image/gif",
    "image/avif", "image/svg+xml", "image/bmp", "image/tiff"
];
const SUBEESHA_IMAGE_UPLOAD_ACCEPT = SUPPORTED_IMAGE_TYPES.join(",");
function isSupportedImageFile(file){
    return !!file && SUPPORTED_IMAGE_TYPES.includes(file.type);
}

/* ===== HERO SLIDER ===== */
let currentSlide = 0;
let heroSlides = [];
let heroDots = [];
let sliderTimer;

function initHeroSlider(){
    heroSlides = Array.from(document.querySelectorAll(".hero-slide"));
    heroDots = Array.from(document.querySelectorAll(".slider-dots .dot"));
    currentSlide = 0;
    showSlide(0);
    restartSlider();
}

function showSlide(index){
    if(!heroSlides.length) return;
    currentSlide = (index + heroSlides.length) % heroSlides.length;
    heroSlides.forEach((slide,i) => slide.classList.toggle("active", i === currentSlide));
    heroDots.forEach((dot,i) => dot.classList.toggle("active", i === currentSlide));
}

function changeSlide(direction){
    showSlide(currentSlide + direction);
    restartSlider();
}

function goToSlide(index){
    showSlide(index);
    restartSlider();
}

function restartSlider(){
    clearInterval(sliderTimer);
    if(heroSlides.length < 2) return;
    sliderTimer = setInterval(() => showSlide(currentSlide + 1), 5000);
}

/* ===== ADVERTISEMENT POPUP ===== */
let adTimer;

function openAd(){
    const ad = document.getElementById("adOverlay");
    if(!ad) return;
    ad.classList.add("show");
    document.body.style.overflow = "hidden";
}

function closeAd(){
    const ad = document.getElementById("adOverlay");
    if(!ad) return;
    ad.classList.remove("show");
    document.body.style.overflow = "";
}

(function initAd(){
    const ad = document.getElementById("adOverlay");
    if(!ad) return;
    ad.addEventListener("click", function(e){
        if(e.target === this) closeAd();
    });
    document.addEventListener("keydown", function(e){
        if(e.key === "Escape") closeAd();
    });
    // Show the promotional popup once per browser session.
    let seen = false;
    try{ seen = sessionStorage.getItem("subeeshaAdSeen") === "1"; }catch(e){}
    if(!seen){
        adTimer = setTimeout(function(){
            if(window.__adDisabled) return;
            openAd();
            try{ sessionStorage.setItem("subeeshaAdSeen","1"); }catch(e){}
        }, 3500);
    }
})();

/* ===== MOBILE NAVIGATION ===== */
function toggleMenu(){
    const nav = document.getElementById("navLinks");
    if(nav) nav.classList.toggle("active");
}

/* ===== TOAST / ALERT SYSTEM ===== */
let toastHideTimer;

function showToast(message, type = "success", title = "Success"){
    if(type === "info") type = "warning";
    const toast = document.getElementById("toast");
    if(!toast) return;

    const icon = toast.querySelector(".toast-icon ion-icon");
    const titleEl = toast.querySelector(".toast-title");
    const messageEl = toast.querySelector(".toast-message");

    const icons = {
        success: "checkmark-outline",
        error: "alert-circle-outline",
        warning: "warning-outline",
        info: "information-circle-outline"
    };

    toast.classList.remove("success","error","warning","info");
    toast.classList.add(type);
    if(icon) icon.setAttribute("name", icons[type] || icons.success);
    if(titleEl) titleEl.textContent = title;
    if(messageEl) messageEl.textContent = message;

    clearTimeout(toastHideTimer);
    toast.classList.remove("show");

    // Restart the progress animation cleanly for every alert.
    void toast.offsetWidth;
    toast.classList.add("show");

    toastHideTimer = setTimeout(() => hideToast(), 2800);
}

function hideToast(){
    const toast = document.getElementById("toast");
    if(toast) toast.classList.remove("show");
}

// Keep all application alerts inside the same branded Subeesha notification system.
window.alert = function(message){
    showToast(String(message), "warning", "Warning");
};

/* ===== PRODUCT / CART ACTIONS ===== */
/* addToCart('<productId>')  - real products loaded from Firebase
   addToCart('Name', 3999)   - static demo card (Firebase not configured) */
function addToCart(idOrName, price){
    const p = (window.__products || []).find(x => x.id === idOrName);
    if(p){
        if(p._stock <= 0){
            showToast(p.name + " is out of stock.", "error", "Out of Stock");
            return;
        }
        SUB.cart.add({ id:p.id, name:p.name, price:p._price, image:p._img, qty:1 });
        showToast(p.name + " added to your cart.", "success", "Added to Cart");
        return;
    }
    SUB.cart.add({ id:"demo-" + SUB.slug(idOrName), name:idOrName, price:Number(price) || 0, qty:1 });
    showToast(idOrName + " added to your cart.", "success", "Added to Cart");
}

function showCart(){
    const items = SUB.cart.get();
    if(!items.length){
        showToast("Your shopping bag is currently empty.", "warning", "Warning");
        return;
    }
    window.location.href = SUB.url("page/billing.html?cart=1");
}

function toggleWish(button){
    const card = button.closest("[data-id]");
    const id = card ? card.dataset.id : null;
    const icon = button.querySelector("ion-icon");
    let added;
    if(id){
        added = SUB.wish.toggle(id);
    }else{
        added = icon.getAttribute("name") === "heart-outline";
    }
    if(added){
        icon.setAttribute("name","heart");
        icon.style.color = "var(--pink)";
        showToast("Product added to your wishlist.", "success", "Wishlist");
    }else{
        icon.setAttribute("name","heart-outline");
        icon.style.color = "";
        showToast("Product removed from your wishlist.", "warning", "Warning");
    }
}

function viewProduct(button){
    const card = button.closest(".card");
    const id = card ? card.dataset.id : "";
    if(id){
        window.location.href = SUB.url("page/billing.html?product=" + encodeURIComponent(id));
        return;
    }
    const name = card ? (card.querySelector("h3")?.textContent.trim() || "") : "";
    window.location.href = SUB.url("page/shop.html?search=" + encodeURIComponent(name));
}

function searchProduct(){
    const searchInput = document.querySelector(".search-box input, #searchInput");
    if(searchInput){
        searchInput.focus();
        showToast("Type a product name in the search box.", "warning", "Warning");
        return;
    }
    showToast("Search is ready. Enter a product name to continue.", "warning", "Warning");
}

/* ===== HEADER SEARCH ===== */
function handleHeaderSearch(event){
    event.preventDefault();
    const input = document.getElementById("headerSearchInput");
    const query = (input?.value || "").trim();

    if(!query){
        showToast("Please enter a product name to search.", "warning", "Warning");
        input?.focus();
        return;
    }
    window.location.href = SUB.url("page/shop.html?search=" + encodeURIComponent(query));
}

/* ===== CUSTOMER REVIEW SLIDER - infinite auto slide ===== */
let reviewTrack = null;
let reviewItems = [];
let reviewCount = 0;
let currentReview = 0;
let reviewTimer;
let reviewStep = 0;
let reviewPaused = false;

function initReviewSlider(){
    reviewTrack = document.getElementById("reviewTrack");
    clearInterval(reviewTimer);
    if(!reviewTrack) return;

    reviewTrack.querySelectorAll(".review.clone").forEach(c => c.remove());
    const originals = Array.from(reviewTrack.querySelectorAll(".review"));
    reviewCount = originals.length;
    currentReview = 0;
    reviewTrack.style.transition = "none";
    reviewTrack.style.transform = "translateX(0)";
    if(reviewCount < 1) return;

    // Clone the first two cards so the row can loop smoothly.
    if(reviewCount > 2){
        originals.slice(0, 2).forEach(card => {
            const c = card.cloneNode(true);
            c.classList.remove("active");
            c.classList.add("clone");
            reviewTrack.appendChild(c);
        });
    }
    reviewItems = Array.from(reviewTrack.querySelectorAll(".review"));

    // Rebuild the dots to match the number of reviews.
    const dots = document.getElementById("reviewDots");
    if(dots){
        dots.innerHTML = originals.map((_, i) =>
            `<button class="review-dot${i===0?" active":""}" onclick="goToReview(${i})" aria-label="Review ${i+1}"></button>`).join("");
    }
    updateReviewStep();
    showReview(0, true);
    restartReviewSlider();
}

function updateReviewStep(){
    if(!reviewTrack || !reviewItems.length) return;
    const gap = parseFloat(getComputedStyle(reviewTrack).gap) || 0;
    reviewStep = reviewItems[0].getBoundingClientRect().width + gap;
}

function showReview(index, instant=false){
    if(!reviewTrack || !reviewItems.length) return;
    currentReview = index;
    reviewTrack.style.transition = instant ? "none" : "transform .65s cubic-bezier(.22,.61,.36,1)";
    reviewTrack.style.transform = `translateX(-${currentReview * reviewStep}px)`;
    document.querySelectorAll("#reviewDots .review-dot")
        .forEach((dot,i)=>dot.classList.toggle("active", i === (currentReview % Math.max(reviewCount,1))));
}

function nextReview(){
    if(reviewCount < 3) return;   // nothing to scroll
    currentReview += 1;
    showReview(currentReview);

    // Once the clones are reached, silently jump back to the original cards.
    if(currentReview >= reviewCount){
        setTimeout(()=>{
            currentReview = 0;
            showReview(0, true);
        }, 700);
    }
}

function changeReview(direction){
    clearInterval(reviewTimer);
    currentReview = Math.min(Math.max(0, currentReview + direction), Math.max(reviewCount - 1, 0));
    showReview(currentReview);
    restartReviewSlider();
}

function goToReview(index){
    clearInterval(reviewTimer);
    currentReview = index;
    showReview(currentReview);
    restartReviewSlider();
}

function restartReviewSlider(){
    clearInterval(reviewTimer);
    reviewTimer = setInterval(()=>{
        if(!reviewPaused) nextReview();
    }, 4200);
}

document.getElementById("reviewTrack")?.addEventListener("mouseenter",()=>reviewPaused=true);
document.getElementById("reviewTrack")?.addEventListener("mouseleave",()=>reviewPaused=false);
window.addEventListener("resize",()=>{
    updateReviewStep();
    showReview(currentReview, true);
});

/* ===== NEWSLETTER ===== */
function subscribe(event){
    event.preventDefault();
    const email = event.target.querySelector("input").value.trim();
    const done = () => {
        showToast("Thanks! Your email has been subscribed.", "success", "Newsletter");
        event.target.reset();
    };
    if(SUB.configured){
        SUB.subscribeNewsletter(email).then(done).catch(() => done());
    }else{
        done();
    }
}

/* ===== FLASH SALE COUNTDOWN (homepage) ===== */
let flashTimer = null;
function startFlashCountdown(endMs){
    clearInterval(flashTimer);
    const h = document.querySelector("#sale #hours");
    const m = document.querySelector("#sale #minutes");
    const s = document.querySelector("#sale #seconds");
    if(!h || !m || !s) return;
    const pad = n => String(n).padStart(2,"0");
    flashTimer = SUB.countdown(endMs, t => {
        h.textContent = pad(t.days * 24 + t.hours);
        m.textContent = pad(t.minutes);
        s.textContent = pad(t.seconds);
    });
}

/* Demo countdown (only when Firebase is not configured) */
(function(){
    const h = document.querySelector("#sale #hours");
    if(!h || SUB.configured) return;
    let total = 12 * 3600 + 30 * 60 + 45;
    const pad = n => String(n).padStart(2,"0");
    function tick(){
        if(total <= 0) total = 24 * 3600;
        h.textContent = pad(Math.floor(total / 3600));
        document.querySelector("#sale #minutes").textContent = pad(Math.floor((total % 3600) / 60));
        document.querySelector("#sale #seconds").textContent = pad(total % 60);
        total--;
    }
    tick();
    setInterval(tick, 1000);
})();

if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", () => { initHeroSlider(); initReviewSlider(); });
}else{
    initHeroSlider(); initReviewSlider();
}
