/* =========================
   SIDEBAR
========================= */

function toggleSidebar(){
    document.getElementById("sidebar").classList.toggle("show");
}

/* Close mobile sidebar automatically when a nav link is tapped */
document.querySelectorAll(".nav[data-page]").forEach(link => {
    link.addEventListener("click", function(){
        if(window.innerWidth < 850){
            document.getElementById("sidebar").classList.remove("show");
        }
    });
});

/* =========================
   TOAST
========================= */

let toastTimer;

function toast(message){

    const toastBox = document.getElementById("toast");

    if(!toastBox) return;

    toastBox.innerText = message;

    toastBox.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(function(){
        toastBox.classList.remove("show");
    },3000);
}

/* =========================
   MODAL SYSTEM
========================= */

let modalAction = null;

function openModal(title, body, action, buttonText = "Save"){

    document.getElementById("modalTitle").innerText = title;
    document.getElementById("modalBody").innerHTML = body;

    modalAction = action;

    document.getElementById("modalSaveBtn").innerText = buttonText;

    document.getElementById("modal").classList.add("show");
}

function closeModal(){

    document.getElementById("modal").classList.remove("show");

    modalAction = null;
}

document.addEventListener("DOMContentLoaded", function(){

    const saveBtn = document.getElementById("modalSaveBtn");

    if(saveBtn){
        saveBtn.onclick = function(){
            if(typeof modalAction === "function"){
                modalAction();
            }
        };
    }

    const modalBg = document.getElementById("modal");

    if(modalBg){
        modalBg.addEventListener("click", function(e){
            if(e.target === this){
                closeModal();
            }
        });
    }

});

/* =========================
   PASSWORD SHOW / HIDE
========================= */

function togglePassword(inputId, button){

    const input = document.getElementById(inputId);

    if(!input) return;

    if(input.type === "password"){

        input.type = "text";

        button.innerHTML =
            '<i class="fa-solid fa-eye-slash"></i>';

    }else{

        input.type = "password";

        button.innerHTML =
            '<i class="fa-solid fa-eye"></i>';
    }
}

/* =========================
   GLOBAL SEARCH
========================= */

let searchTimeout;

function globalSearch(value){

    clearTimeout(searchTimeout);

    const query = value.trim().toLowerCase();

    if(!query) return;

    searchTimeout = setTimeout(function(){

        const allText =
            document.body.innerText.toLowerCase();

        if(allText.includes(query)){
            toast('Search result found for "' + value + '"');
        }else{
            toast('No result found for "' + value + '"');
        }

    },500);
}
