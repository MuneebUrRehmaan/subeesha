
/* ================= SIDEBAR TOGGLE ================= */

const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");

if(menuToggle && sidebar){

    menuToggle.addEventListener("click", function(){

        sidebar.classList.toggle("show");

    });

}


/* ================= ACTIVE MENU (based on current page) ================= */

const menuItems =
    document.querySelectorAll(".menu-item");

const currentPage =
    window.location.pathname
        .split("/")
        .pop() || "dashboard.html";

menuItems.forEach(function(item){

    const itemPage =
        item
        .getAttribute("href")
        .split("/")
        .pop();

    if(itemPage === currentPage){
        item.classList.add("active");
    }else{
        item.classList.remove("active");
    }

    item.addEventListener("click", function(){

        if(window.innerWidth < 900 && sidebar){
            sidebar.classList.remove("show");
        }

    });

});


/* ================= TOAST ================= */

function showToast(message){

    const toast =
        document.getElementById("toast");

    const toastMessage =
        document.getElementById("toastMessage");

    if(!toast || !toastMessage) return;

    toastMessage.textContent = message;

    toast.classList.add("show");

    setTimeout(function(){

        toast.classList.remove("show");

    },3000);

}


/* ================= SCROLL (same-page sections) ================= */

function scrollToSection(id){

    const el =
        document.getElementById(id);

    if(el){

        el.scrollIntoView({
            behavior:"smooth"
        });

    }

}


/* ================= GO TO PAGE (cross-page navigation) ================= */

function goToPage(page){

    window.location.href = page;

}


/* ================= SHARE PRODUCT ================= */

function shareProduct(productName){

    const productLink =
        "https://subeesha.com/product/" +
        productName
            .toLowerCase()
            .replaceAll(" ","-") +
        "?ref=RES001";

    if(navigator.clipboard){

        navigator.clipboard
            .writeText(productLink);

    }

    showToast(
        productName +
        " referral link copied!"
    );

}


function copyReferralLink(){

    const referralLink =
        "https://subeesha.com/?ref=RES001";

    if(navigator.clipboard){

        navigator.clipboard
            .writeText(referralLink);

    }

    showToast(
        "Your reseller referral link copied!"
    );

}


/* ================= PRODUCT SEARCH (products page only) ================= */

const productSearch =
    document.getElementById("productSearch");

const productCards =
    document.querySelectorAll(".product-card");

if(productSearch){

    productSearch.addEventListener(
        "keyup",
        function(){

            const value =
                this.value.toLowerCase();

            productCards.forEach(function(card){

                const product =
                    card
                    .dataset
                    .product
                    .toLowerCase();

                if(product.includes(value)){

                    card.style.display = "block";

                }else{

                    card.style.display = "none";

                }

            });

        }
    );

}


/* ================= ORDER SYSTEM (products page only) ================= */

const orderModal =
    document.getElementById("orderModal");

let selectedProduct = "";
let selectedPrice = 0;
let selectedCommission = 0;
let quantity = 1;


/* OPEN ORDER MODAL */

function openOrderModal(
    productName,
    price,
    commission
){

    if(!orderModal) return;

    selectedProduct = productName;
    selectedPrice = price;
    selectedCommission = commission;

    quantity = 1;

    document
        .getElementById("modalProductName")
        .textContent = productName;

    document
        .getElementById("modalProductPrice")
        .textContent =
        "Rs. " +
        price.toLocaleString();

    document
        .getElementById("quantityValue")
        .textContent = quantity;

    updateOrderSummary();

    orderModal.classList.add("show");

    document.body.style.overflow = "hidden";

}


/* CLOSE MODAL */

function closeOrderModal(){

    if(!orderModal) return;

    orderModal.classList.remove("show");

    document.body.style.overflow = "auto";

    const form =
        document.getElementById("createOrderForm");

    if(form) form.reset();

}


/* CLOSE WHEN CLICK OUTSIDE */

if(orderModal){

    orderModal.addEventListener(
        "click",
        function(e){

            if(e.target === orderModal){

                closeOrderModal();

            }

        }
    );

}


/* QUANTITY */

function changeQuantity(value){

    quantity = quantity + value;

    if(quantity < 1){

        quantity = 1;

    }

    const qtyEl =
        document.getElementById("quantityValue");

    if(qtyEl) qtyEl.textContent = quantity;

    updateOrderSummary();

}


/* UPDATE ORDER TOTAL */

function updateOrderSummary(){

    const total =
        selectedPrice * quantity;

    const commission =
        (total * selectedCommission) / 100;

    const priceEl =
        document.getElementById("summaryPrice");

    const commissionEl =
        document.getElementById("summaryCommission");

    const totalEl =
        document.getElementById("summaryTotal");

    if(priceEl){

        priceEl.textContent =
            "Rs. " +
            selectedPrice.toLocaleString() +
            " × " +
            quantity;

    }

    if(commissionEl){

        commissionEl.textContent =
            "Rs. " +
            commission.toLocaleString();

    }

    if(totalEl){

        totalEl.textContent =
            "Rs. " +
            total.toLocaleString();

    }

}


/* ================= PLACE ORDER (products page only) ================= */

const createOrderForm =
    document.getElementById("createOrderForm");

if(createOrderForm){

    createOrderForm.addEventListener(
        "submit",
        function(e){

            e.preventDefault();


            const customerName =
                document
                .getElementById("customerName")
                .value;

            const customerPhone =
                document
                .getElementById("customerPhone")
                .value;

            const customerCity =
                document
                .getElementById("customerCity")
                .value;

            const customerAddress =
                document
                .getElementById("customerAddress")
                .value;


            const totalAmount =
                selectedPrice * quantity;

            const commissionAmount =
                (totalAmount *
                selectedCommission) / 100;


            const orderId =
                "#SUB-" +
                Math.floor(
                    1000 +
                    Math.random() * 9000
                );


            console.log({

                orderId:orderId,

                customer:{
                    name:customerName,
                    phone:customerPhone,
                    city:customerCity,
                    address:customerAddress
                },

                product:selectedProduct,

                quantity:quantity,

                total:totalAmount,

                commission:commissionAmount

            });


            closeOrderModal();


            showToast(
                "Order " +
                orderId +
                " placed successfully!"
            );


            setTimeout(function(){

                window.location.href = "orders.html";

            },700);

        }
    );

}


/* ================= WITHDRAW (withdraw page only) ================= */

const withdrawForm =
    document.getElementById("withdrawForm");

if(withdrawForm){

    withdrawForm.addEventListener(
        "submit",
        function(e){

            e.preventDefault();

            const amount =
                Number(
                    document
                    .getElementById("withdrawAmount")
                    .value
                );

            const account =
                document
                .getElementById("accountNumber")
                .value;

            if(amount < 1000){

                showToast(
                    "Minimum withdrawal amount is Rs. 1,000"
                );

                return;

            }

            if(account.length < 5){

                showToast(
                    "Please enter a valid account number."
                );

                return;

            }

            showToast(
                "Withdrawal request submitted successfully!"
            );

            withdrawForm.reset();

        }
    );

}


/* ================= CLOSE MOBILE SIDEBAR ON OUTSIDE CLICK ================= */

document.addEventListener(
    "click",
    function(e){

        if(
            sidebar &&
            menuToggle &&
            window.innerWidth < 900 &&
            sidebar.classList.contains("show") &&
            !sidebar.contains(e.target) &&
            !menuToggle.contains(e.target)
        ){

            sidebar.classList.remove("show");

        }

    }
);
