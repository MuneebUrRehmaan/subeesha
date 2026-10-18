
/* =====================================================
   MOBILE MENU
===================================================== */

function toggleMenu(){

    document
        .getElementById("navLinks")
        .classList.toggle("show");

}


/* =====================================================
   CART
===================================================== */

let cartCount = 0;


function addToCart(product){

    cartCount++;

    document
        .getElementById("cartCount")
        .textContent = cartCount;

    showToast(product + " added to cart!");

}


function showCart(){

    showToast(
        "Your cart has " +
        cartCount +
        " item(s)"
    );

}


/* =====================================================
   WISHLIST
===================================================== */

function toggleWishlist(button){

    button.classList.toggle("active");

    const icon =
        button.querySelector("ion-icon");


    if(button.classList.contains("active")){

        icon.setAttribute("name","heart");

        showToast("Added to wishlist");

    }else{

        icon.setAttribute("name","heart-outline");

        showToast("Removed from wishlist");

    }

}


/* =====================================================
   PRODUCT FILTER
===================================================== */

function filterProducts(category, button){

    document
        .querySelectorAll(".filter-btn")
        .forEach(function(btn){

            btn.classList.remove("active");

        });


    button.classList.add("active");


    document
        .querySelectorAll(".product-card")
        .forEach(function(product){

            if(
                category === "all" ||
                product.dataset.category === category
            ){

                product.style.display = "block";

            }else{

                product.style.display = "none";

            }

        });

}


/* =====================================================
   SEARCH
===================================================== */

function searchProduct(){

    const query =
        document
        .getElementById("searchInput")
        .value
        .toLowerCase()
        .trim();


    const products =
        document.querySelectorAll(".product-card");


    let found = 0;


    products.forEach(function(product){

        const productName =
            product
            .querySelector("h3")
            .textContent
            .toLowerCase();


        const category =
            product.dataset.category
            .toLowerCase();


        if(
            query === "" ||
            productName.includes(query) ||
            category.includes(query)
        ){

            product.style.display = "block";

            found++;

        }else{

            product.style.display = "none";

        }

    });


    if(query === ""){

        showToast("Showing all flash sale products");

    }else{

        showToast(found + " product(s) found");

    }


    document
        .getElementById("flash-products")
        .scrollIntoView({
            behavior:"smooth"
        });

}


/* =====================================================
   FLASH SALE COUNTDOWN

   Timer will continue from the saved end time.
   It will NOT reset when the page is refreshed.
===================================================== */

let saleEnd =
    localStorage.getItem("subeeshaFlashSaleEnd");


if(!saleEnd){

    const threeDays =
        3 * 24 * 60 * 60 * 1000;

    saleEnd =
        new Date().getTime() + threeDays;

    localStorage.setItem(
        "subeeshaFlashSaleEnd",
        saleEnd
    );

}


function updateCountdown(){

    const now =
        new Date().getTime();


    const distance =
        saleEnd - now;


    if(distance <= 0){

        document
            .getElementById("days")
            .textContent = "00";

        document
            .getElementById("hours")
            .textContent = "00";

        document
            .getElementById("minutes")
            .textContent = "00";

        document
            .getElementById("seconds")
            .textContent = "00";


        clearInterval(countdownInterval);

        return;

    }


    const days =
        Math.floor(
            distance /
            (1000 * 60 * 60 * 24)
        );


    const hours =
        Math.floor(
            (
                distance %
                (1000 * 60 * 60 * 24)
            )
            /
            (1000 * 60 * 60)
        );


    const minutes =
        Math.floor(
            (
                distance %
                (1000 * 60 * 60)
            )
            /
            (1000 * 60)
        );


    const seconds =
        Math.floor(
            (
                distance %
                (1000 * 60)
            )
            /
            1000
        );


    document
        .getElementById("days")
        .textContent =
        String(days).padStart(2,"0");


    document
        .getElementById("hours")
        .textContent =
        String(hours).padStart(2,"0");


    document
        .getElementById("minutes")
        .textContent =
        String(minutes).padStart(2,"0");


    document
        .getElementById("seconds")
        .textContent =
        String(seconds).padStart(2,"0");

}


/* Start timer */

updateCountdown();

const countdownInterval =
    setInterval(
        updateCountdown,
        1000
    );


/* =====================================================
   NEWSLETTER
===================================================== */

function subscribe(event){

    event.preventDefault();

    showToast(
        "Thank you for subscribing to Subeesha!"
    );

    event.target.reset();

}


/* =====================================================
   TOAST
===================================================== */

let toastTimer;


function showToast(message){

    const toast =
        document.getElementById("toast");


    document
        .getElementById("toastText")
        .textContent = message;


    toast.classList.add("show");


    clearTimeout(toastTimer);


    toastTimer =
        setTimeout(function(){

            toast.classList.remove("show");

        },3000);

}

