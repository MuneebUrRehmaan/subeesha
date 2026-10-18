
let cartCount = 0;
let selectedProduct = "";

/* MOBILE MENU */

function toggleMenu(){

document
.getElementById("navLinks")
.classList.toggle("show");

}

/* CART */

function addToCart(product){

cartCount++;

document
.getElementById("cartCount")
.textContent = cartCount;

showToast(product + " added to cart!");

}

function showCart(){

showToast("Your cart has " + cartCount + " item(s)");

}

/* WISHLIST */

function toggleWishlist(button){

button.classList.toggle("active");

const icon = button.querySelector("i");

if(button.classList.contains("active")){

icon.classList.remove("fa-regular");
icon.classList.add("fa-solid");

showToast("Added to wishlist");

}else{

icon.classList.remove("fa-solid");
icon.classList.add("fa-regular");

showToast("Removed from wishlist");

}

}

/* FILTER */

function filterProducts(category,button){

document.querySelectorAll(".filter-btn")
.forEach(btn => btn.classList.remove("active"));

button.classList.add("active");

document.querySelectorAll(".product-card")
.forEach(product => {

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

/* SEARCH */

function searchProducts(){

const query =
document
.getElementById("searchInput")
.value
.toLowerCase()
.trim();

let found = 0;

document.querySelectorAll(".product-card")
.forEach(product => {

const name =
product.querySelector("h3")
.textContent
.toLowerCase();

const category =
product.dataset.category.toLowerCase();

if(
query === "" ||
name.includes(query) ||
category.includes(query)
){

product.style.display = "block";
found++;

}else{

product.style.display = "none";

}

});

showToast(
query
? found + " product(s) found"
: "Showing all products"
);

}

/* QUICK VIEW */

function quickView(
title,
category,
price,
description,
image
){

selectedProduct = title;

document.getElementById("modalTitle").textContent = title;
document.getElementById("modalCategory").textContent = category;
document.getElementById("modalPrice").textContent = price;
document.getElementById("modalDescription").textContent = description;
document.getElementById("modalImage").src = image;

document
.getElementById("productModal")
.classList.add("show");

}

function closeModal(){

document
.getElementById("productModal")
.classList.remove("show");

}

function addModalProductToCart(){

if(selectedProduct){

addToCart(selectedProduct);

closeModal();

}

}

/* NEWSLETTER */

function subscribe(event){

event.preventDefault();

showToast(
"Thank you for subscribing to Subeesha!"
);

event.target.reset();

}

/* TOAST */

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

/* CLOSE MODAL */

document
.getElementById("productModal")
.addEventListener("click",function(event){

if(event.target === this){

closeModal();

}

});

