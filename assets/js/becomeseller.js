
/* ===============================
   MOBILE MENU
================================ */

const mobileMenu =
    document.getElementById("mobileMenu");

const navLinks =
    document.getElementById("navLinks");

mobileMenu.addEventListener("click", function(){

    navLinks.classList.toggle("show");

});


/* ===============================
   CLOSE MOBILE MENU
================================ */

document.querySelectorAll(".nav-links a")
.forEach(function(link){

    link.addEventListener("click", function(){

        navLinks.classList.remove("show");

    });

});


/* ===============================
   SCROLL TO REGISTRATION
================================ */

function scrollToRegister(){

    document
    .getElementById("register")
    .scrollIntoView({
        behavior:"smooth"
    });

}


/* ===============================
   FAQ
================================ */

const faqItems =
    document.querySelectorAll(".faq-item");

faqItems.forEach(function(item){

    const question =
        item.querySelector(".faq-question");

    question.addEventListener("click", function(){

        faqItems.forEach(function(otherItem){

            if(otherItem !== item){

                otherItem.classList.remove("active");

            }

        });

        item.classList.toggle("active");

    });

});


/* ===============================
   CNIC FORMAT
================================ */

const cnicInput =
    document.getElementById("cnic");

cnicInput.addEventListener("input", function(){

    let value =
        this.value.replace(/\D/g,"");

    if(value.length > 13){
        value = value.slice(0,13);
    }

    if(value.length > 5){
        value =
        value.slice(0,5) +
        "-" +
        value.slice(5);
    }

    if(value.length > 13){
        value =
        value.slice(0,13) +
        "-" +
        value.slice(13);
    }

    this.value = value;

});


/* ===============================
   RESELLER FORM
================================ */

const resellerForm =
    document.getElementById("resellerForm");

const successModal =
    document.getElementById("successModal");


resellerForm.addEventListener(
    "submit",
    function(e){

        e.preventDefault();


        const fullName =
            document
            .getElementById("fullName")
            .value;

        const phone =
            document
            .getElementById("phone")
            .value;

        const email =
            document
            .getElementById("email")
            .value;

        const city =
            document
            .getElementById("city")
            .value;

        const cnic =
            document
            .getElementById("cnic")
            .value;

        const paymentMethod =
            document
            .getElementById("paymentMethod")
            .value;

        const accountNumber =
            document
            .getElementById("accountNumber")
            .value;


        /* Basic Validation */

        if(
            fullName.trim() === "" ||
            phone.trim() === "" ||
            email.trim() === "" ||
            city.trim() === "" ||
            cnic.trim() === "" ||
            paymentMethod === "" ||
            accountNumber.trim() === ""
        ){

            alert(
                "Please complete all required fields."
            );

            return;

        }


        if(
            cnic.replace(/\D/g,"").length !== 13
        ){

            alert(
                "Please enter a valid 13 digit CNIC number."
            );

            return;

        }


        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){
            alert("Please enter a valid email address.");
            return;
        }
        if(!window.SUB || !SUB.configured){
            alert("The store is not connected to Firebase yet.");
            return;
        }

        const fileIds = ["profilePicture","cnicFront","cnicBack","chequePicture","feeReceipt"];
        const files = {};
        for(const id of fileIds){
            const f = document.getElementById(id).files[0];
            if(f){
                const err = SUB.cloud.valid(f, true);
                if(err){ alert(err); return; }
                files[id] = f;
            }
        }

        const btn = resellerForm.querySelector('button[type="submit"]');
        const original = btn ? btn.innerHTML : "";
        if(btn){ btn.disabled = true; btn.textContent = "Uploading documents..."; }

        const docs = {};
        (async function(){
            for(const id of Object.keys(files)){
                const r = await SUB.cloud.upload(files[id], { folder: "reseller-applications", allowPdf: true });
                docs[id] = r.url;
            }
            if(btn) btn.textContent = "Submitting...";
            await SUB.db.collection("resellerApplications").add({
                fullName: fullName.trim(), phone: phone.trim(), email: email.trim().toLowerCase(),
                city: city.trim(), cnic: cnic.trim(), paymentMethod: paymentMethod,
                accountNumber: accountNumber.trim(), documents: docs,
                status: "Pending", createdAt: SUB.now()
            });
            successModal.classList.add("show");
            document.body.style.overflow = "hidden";
            resellerForm.reset();
            document.querySelectorAll(".upload-preview").forEach(function(p){
                if(p.dataset.original) p.innerHTML = p.dataset.original;
            });
        })().catch(function(err){
            alert((err && err.message) || "Could not submit your application. Please try again.");
        }).finally(function(){
            if(btn){ btn.disabled = false; btn.innerHTML = original; }
        });
    }
);

/* ===============================
   CLOSE SUCCESS MODAL
================================ */

function closeSuccessModal(){

    successModal.classList.remove("show");

    document.body.style.overflow =
        "auto";

}


successModal.addEventListener(
    "click",
    function(e){

        if(e.target === successModal){

            closeSuccessModal();

        }

    }
);
/* ===============================
   IMAGE / DOCUMENT PREVIEW
================================ */

function previewUpload(inputId, previewId){

    const input =
        document.getElementById(inputId);

    const preview =
        document.getElementById(previewId);

    input.addEventListener("change", function(){

        const file = this.files[0];

        if(!file) return;

        /* PDF FILE */

        if(file.type === "application/pdf"){

            preview.innerHTML = `
                <ion-icon name="document-text-outline"></ion-icon>
                <span>${SUB.esc(file.name)}</span>
            `;

            return;

        }

        /* IMAGE FILE */

        const reader = new FileReader();

        reader.onload = function(e){

            preview.innerHTML = `
                <img src="${e.target.result}"
                alt="Document Preview">
            `;

        };

        reader.readAsDataURL(file);

    });

}


/* ===============================
   INITIALIZE PREVIEWS
================================ */

previewUpload(
    "profilePicture",
    "profilePreview"
);

previewUpload(
    "cnicFront",
    "cnicFrontPreview"
);

previewUpload(
    "cnicBack",
    "cnicBackPreview"
);

previewUpload(
    "chequePicture",
    "chequePreview"
);

previewUpload(
    "feeReceipt",
    "receiptPreview"
);

