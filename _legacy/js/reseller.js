/* =========================================================
   SUBEESHA RESELLER PAGE JAVASCRIPT
========================================================= */


/* =========================================================
   MOBILE MENU
========================================================= */

function toggleMenu(){

    const navLinks = document.getElementById("navLinks");

    navLinks.classList.toggle("active");

}


/* =========================================================
   SMOOTH SCROLL
========================================================= */

function scrollToSection(id){

    const section = document.getElementById(id);

    if(section){

        section.scrollIntoView({

            behavior:"smooth",

            block:"start"

        });

    }

}


/* =========================================================
   JOIN MODAL
========================================================= */

function openJoinModal(){

    const modal = document.getElementById("joinModal");

    modal.classList.add("show");

    document.body.style.overflow = "hidden";

}


function closeJoinModal(){

    const modal = document.getElementById("joinModal");

    modal.classList.remove("show");

    document.body.style.overflow = "";

}


/* =========================================================
   RESELLER APPLICATION
========================================================= */

function submitResellerForm(event){

    event.preventDefault();


    const name = document
        .getElementById("resellerName")
        .value
        .trim();


    const phone = document
        .getElementById("resellerPhone")
        .value
        .trim();


    const email = document
        .getElementById("resellerEmail")
        .value
        .trim();


    const city = document
        .getElementById("resellerCity")
        .value
        .trim();


    const platform = document
        .getElementById("resellerPlatform")
        .value;


    if(
        !name ||
        !phone ||
        !email ||
        !city ||
        !platform
    ){

        showToast(

            "Please complete all required fields.",

            "warning",

            "Incomplete Form"

        );

        return;

    }


    /* Demo data for frontend.
       Later connect this to backend / database. */

    const resellerData = {

        name:name,

        phone:phone,

        email:email,

        city:city,

        platform:platform,

        date:new Date().toISOString()

    };


    localStorage.setItem(

        "subeeshaResellerApplication",

        JSON.stringify(resellerData)

    );


    closeJoinModal();


    showToast(

        "Your reseller application has been submitted successfully.",

        "success",

        "Application Submitted"

    );


    document
        .getElementById("resellerForm")
        .reset();

}


/* =========================================================
   COMMISSION CALCULATOR
========================================================= */

function calculateCommission(){

    const productCommission = Number(

        document
            .getElementById("productSelect")
            .value

    );


    let sales = Number(

        document
            .getElementById("salesInput")
            .value

    );


    if(!sales || sales < 1){

        sales = 1;

        document
            .getElementById("salesInput")
            .value = 1;

    }


    const totalCommission =

        productCommission * sales;


    document
        .getElementById("commissionResult")
        .textContent =

        "Rs. " +

        totalCommission.toLocaleString();

}


function changeSales(value){

    const input =

        document
            .getElementById("salesInput");


    let currentValue = Number(input.value);


    currentValue += value;


    if(currentValue < 1){

        currentValue = 1;

    }


    input.value = currentValue;


    calculateCommission();

}


/* =========================================================
   SHARE PRODUCT
========================================================= */

function shareProduct(button){

    const product = button.dataset.product;

    const price = button.dataset.price;

    const commission = button.dataset.commission;


    const message =

        "✨ Subeesha Product\n\n" +

        "🛍 Product: " + product + "\n" +

        "💰 Price: Rs. " + Number(price).toLocaleString() + "\n\n" +

        "Order now through Subeesha!\n" +

        "https://subeesha.com/?ref=AISHA2026";


    if(navigator.share){

        navigator.share({

            title:product,

            text:message

        })
        .then(() => {

            showToast(

                product + " shared successfully.",

                "success",

                "Product Shared"

            );

        })
        .catch(() => {});

    }

    else{

        copyText(message);


        showToast(

            "Product details copied. You can now share them anywhere.",

            "success",

            "Ready To Share"

        );

    }


    console.log(

        "Product:", product,

        "Price:", price,

        "Commission:", commission

    );

}


/* =========================================================
   COPY RESELLER LINK
========================================================= */

function copyResellerLink(){

    const input = document
        .getElementById("resellerLink");


    if(input){

        copyText(input.value);

    }

    else{

        copyText(

            "https://subeesha.com/?ref=AISHA2026"

        );

    }


    showToast(

        "Your reseller link has been copied successfully.",

        "success",

        "Link Copied"

    );

}


/* =========================================================
   COPY TEXT
========================================================= */

function copyText(text){

    if(navigator.clipboard){

        navigator.clipboard.writeText(text);

    }

    else{

        const textarea =
            document.createElement("textarea");


        textarea.value = text;


        document.body.appendChild(textarea);


        textarea.select();


        document.execCommand("copy");


        document.body.removeChild(textarea);

    }

}


/* =========================================================
   DASHBOARD TABS
========================================================= */

function switchDashboard(panel, button){

    const panels =

        document.querySelectorAll(
            ".dashboard-panel"
        );


    const menuItems =

        document.querySelectorAll(
            ".reseller-menu-item"
        );


    panels.forEach(function(item){

        item.classList.remove("active");

    });


    menuItems.forEach(function(item){

        item.classList.remove("active");

    });


    const selectedPanel =

        document.getElementById(
            panel + "Panel"
        );


    if(selectedPanel){

        selectedPanel.classList.add("active");

    }


    if(button){

        button.classList.add("active");

    }

}


/* =========================================================
   WITHDRAWAL
========================================================= */

function requestWithdrawal(){

    const availableBalance = 12450;


    if(availableBalance <= 0){

        showToast(

            "You do not have enough balance to request a withdrawal.",

            "warning",

            "Withdrawal"

        );

        return;

    }


    showToast(

        "Your withdrawal request has been submitted for Rs. " +
        availableBalance.toLocaleString() + ".",

        "success",

        "Withdrawal Requested"

    );

}


/* =========================================================
   FAQ
========================================================= */

document.addEventListener(

    "DOMContentLoaded",

    function(){

        const faqQuestions =

            document.querySelectorAll(
                ".faq-question"
            );


        faqQuestions.forEach(function(question){

            question.addEventListener(

                "click",

                function(){

                    const faqItem =
                        this.parentElement;


                    const isActive =
                        faqItem.classList.contains(
                            "active"
                        );


                    document
                        .querySelectorAll(
                            ".faq-item"
                        )
                        .forEach(function(item){

                            item.classList.remove(
                                "active"
                            );

                        });


                    if(!isActive){

                        faqItem.classList.add(
                            "active"
                        );

                    }

                }

            );

        });


        calculateCommission();

    }

);


/* =========================================================
   TOAST NOTIFICATION
========================================================= */

let toastTimer;


function showToast(

    message,

    type = "success",

    title = "Success"

){

    const toast =
        document.getElementById("toast");


    const toastTitle =
        document.getElementById("toastTitle");


    const toastMessage =
        document.getElementById("toastMessage");


    const toastIcon =
        document.getElementById("toastIcon");


    toast.className =
        "toast " + type;


    toastTitle.textContent =
        title;


    toastMessage.textContent =
        message;


    if(type === "success"){

        toastIcon.setAttribute(

            "name",

            "checkmark-outline"

        );

    }

    else if(type === "warning"){

        toastIcon.setAttribute(

            "name",

            "alert-outline"

        );

    }

    else if(type === "error"){

        toastIcon.setAttribute(

            "name",

            "close-outline"

        );

    }

    else{

        toastIcon.setAttribute(

            "name",

            "information-circle-outline"

        );

    }


    toast.classList.add("show");


    clearTimeout(toastTimer);


    toastTimer = setTimeout(

        function(){

            hideToast();

        },

        3000

    );

}


function hideToast(){

    const toast =
        document.getElementById("toast");


    toast.classList.remove("show");

}


/* =========================================================
   CLOSE MODAL WITH ESCAPE KEY
========================================================= */

document.addEventListener(

    "keydown",

    function(event){

        if(event.key === "Escape"){

            closeJoinModal();

        }

    }

);


/* =========================================================
   CLOSE MOBILE MENU WHEN LINK IS CLICKED
========================================================= */

document
    .querySelectorAll(
        "#navLinks a"
    )
    .forEach(function(link){

        link.addEventListener(

            "click",

            function(){

                const navLinks =
                    document.getElementById(
                        "navLinks"
                    );


                navLinks.classList.remove(
                    "active"
                );

            }

        );

    });