
/* ================= MOBILE MENU ================= */

function toggleMenu(){

    document
        .getElementById("navLinks")
        .classList.toggle("show");

}


/* ================= CATEGORY FILTER ================= */

function filterCategories(category,button){

    document
        .querySelectorAll(".filter-btn")
        .forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");


    document
        .querySelectorAll(".category-card")
        .forEach(card => {

            if(
                category === "all" ||
                card.dataset.category === category
            ){

                card.style.display = "block";

            }else{

                card.style.display = "none";

            }

        });

}


/* ================= SEARCH ================= */

function searchProduct(){

    const input =
        document.getElementById("searchInput");

    const query =
        input.value.trim();

    if(!query){

        showToast("Please enter a product name");

        return;

    }

    showToast(
        'Searching for "' + query + '"'
    );

}


/* ================= NEWSLETTER ================= */

function subscribe(event){

    event.preventDefault();

    showToast(
        "Thank you for subscribing to Subeesha!"
    );

    event.target.reset();

}


/* ================= TOAST ================= */

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

