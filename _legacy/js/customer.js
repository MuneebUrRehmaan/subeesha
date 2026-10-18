
/* =====================================
   DEFAULT APPROVED REVIEWS
===================================== */

const defaultReviews = [

{
    id:"SUB-1001",
    name:"Ayesha Khan",
    city:"Karachi",
    product:"Elegant Summer Dress",
    rating:5,
    review:"The product quality was excellent and delivery was faster than expected. The whole shopping experience was simple and smooth.",
    status:"approved",
    date:"2 days ago"
},

{
    id:"SUB-1002",
    name:"Ali Raza",
    city:"Hyderabad",
    product:"Ultra Slim Laptop",
    rating:5,
    review:"Very satisfied with my order. The product was exactly as shown and the packaging was also very professional.",
    status:"approved",
    date:"5 days ago"
},

{
    id:"SUB-1003",
    name:"Fatima Noor",
    city:"Lahore",
    product:"Glow Skincare Collection",
    rating:4,
    review:"Loved the product and the quality was really good. I would definitely recommend Subeesha to my friends and family.",
    status:"approved",
    date:"1 week ago"
},

{
    id:"SUB-1004",
    name:"Ahmed Shah",
    city:"Islamabad",
    product:"Premium Laptop",
    rating:5,
    review:"Amazing service from ordering to delivery. Everything arrived safely and customer support was very helpful.",
    status:"approved",
    date:"1 week ago"
},

{
    id:"SUB-1005",
    name:"Sana Malik",
    city:"Multan",
    product:"Luxury Makeup Kit",
    rating:4,
    review:"The shopping process was easy and I really liked the clean website. The product was beautiful and worth the price.",
    status:"approved",
    date:"2 weeks ago"
},

{
    id:"SUB-1006",
    name:"Usman Ahmed",
    city:"Sukkur",
    product:"Modern Home Decor Set",
    rating:5,
    review:"Great experience overall. The delivery was on time and the product quality was better than I expected.",
    status:"approved",
    date:"3 weeks ago"
}

];


/* =====================================
   LOAD REVIEWS
===================================== */

let reviews =
JSON.parse(localStorage.getItem("subeeshaReviews"));

if(!reviews){

reviews = defaultReviews;

saveReviews();

}


/* =====================================
   SAVE
===================================== */

function saveReviews(){

localStorage.setItem(
"subeeshaReviews",
JSON.stringify(reviews)
);

}


/* =====================================
   MOBILE MENU
===================================== */

function toggleMenu(){

document
.getElementById("navLinks")
.classList.toggle("show");

}


/* =====================================
   STARS
===================================== */

/* =========================
   ESCAPE HTML
   Prevents stored XSS: any text a customer submits
   (name, city, product, review) is rendered back into
   the page, so it must be escaped before going into innerHTML.
========================= */
function escapeHTML(value){
    const div = document.createElement("div");
    div.textContent = value || "";
    return div.innerHTML;
}

function getStars(rating){

let stars = "";

for(let i = 1; i <= 5; i++){

if(i <= rating){

stars += "★";

}else{

stars += "☆";

}

}

return stars;

}


/* =====================================
   RENDER APPROVED REVIEWS
===================================== */

function renderReviews(){

const grid =
document.getElementById("reviewsGrid");

const search =
(
document.getElementById("reviewSearch").value ||
document.getElementById("headerSearch").value
)
.toLowerCase()
.trim();

const filter =
document.getElementById("ratingFilter").value;

const approvedReviews =
reviews.filter(function(review){

return review.status === "approved";

});

const filteredReviews =
approvedReviews.filter(function(review){

const searchable =
(
review.id + " " +
review.product + " " +
review.review
).toLowerCase();

const searchMatch =
search === "" ||
searchable.includes(search);

const ratingMatch =
filter === "all" ||
review.rating == filter;

return searchMatch && ratingMatch;

});


if(filteredReviews.length === 0){

grid.innerHTML = `

<div class="empty-state">

<i class="fa-regular fa-face-smile"></i>

<h3>No Approved Reviews Found</h3>

<p>
Try changing your search or rating filter.
</p>

</div>

`;

return;

}


grid.innerHTML =
filteredReviews.map(function(review){

return `

<div class="review-card">

<div class="review-top">

<div class="customer-id">

<div class="customer-avatar">
<i class="fa-solid fa-user"></i>
</div>

<div>

<h3>${escapeHTML(review.id)}</h3>

<span>
Verified Subeesha Customer
</span>

</div>

</div>


<div class="verified">

<i class="fa-solid fa-circle-check"></i>

Verified

</div>

</div>


<div class="review-stars">

${getStars(review.rating)}

</div>


<p class="review-text">

${escapeHTML(review.review)}

</p>


<div class="product-bought">

<i class="fa-solid fa-bag-shopping"></i>

Purchased: ${escapeHTML(review.product)}

</div>


<div class="review-footer">

<span class="review-date">

${review.date}

</span>


<div class="review-buttons">

<button
class="review-btn"
onclick="likeReview(this)">

<i class="fa-regular fa-thumbs-up"></i>

<span>Helpful</span>

</button>


<button
class="review-btn"
onclick="favoriteReview(this)">

<i class="fa-regular fa-heart"></i>

</button>

</div>

</div>

</div>

`;

}).join("");

updateRatingSummary();

}


/* =====================================
   RATING SUMMARY
===================================== */

function updateRatingSummary(){

const approved =
reviews.filter(function(review){

return review.status === "approved";

});

if(approved.length === 0){

document.getElementById("averageRating")
.textContent = "0.0";

document.getElementById("averageStars")
.textContent = "☆☆☆☆☆";

document.getElementById("reviewCount")
.textContent = "No approved reviews yet";

return;

}


const total =
approved.reduce(function(sum,review){

return sum + Number(review.rating);

},0);


const average =
(total / approved.length).toFixed(1);


document.getElementById("averageRating")
.textContent = average;


document.getElementById("averageStars")
.textContent =
getStars(Math.round(average));


document.getElementById("reviewCount")
.textContent =
"Based on " +
approved.length +
" verified customer review(s)";

}


/* =====================================
   SUBMIT REVIEW
===================================== */

function submitReview(event){

event.preventDefault();


const nextNumber =
getNextSubNumber();


const newReview = {

id:"SUB-" + nextNumber,

name:
document.getElementById("customerName").value,

city:
document.getElementById("customerCity").value,

product:
document.getElementById("customerProduct").value,

rating:
Number(
document.getElementById("customerRating").value
),

review:
document.getElementById("customerReview").value,

status:"pending",

date:"Just now"

};


reviews.push(newReview);

saveReviews();

event.target.reset();

closeReviewModal();

renderPendingReviews();

showToast(
newReview.id +
" submitted for verification"
);

}


/* =====================================
   NEXT SUB ID
===================================== */

function getNextSubNumber(){

let highest = 1000;


reviews.forEach(function(review){

const number =
parseInt(
review.id.replace("SUB-","")
);

if(number > highest){

highest = number;

}

});


return highest + 1;

}


/* =====================================
   PENDING REVIEWS
===================================== */

function renderPendingReviews(){

const pendingList =
document.getElementById("pendingList");


const pendingReviews =
reviews.filter(function(review){

return review.status === "pending";

});


if(pendingReviews.length === 0){

pendingList.innerHTML = `

<div class="no-pending">

<i class="fa-solid fa-circle-check"></i>

<br><br>

No reviews waiting for verification.

</div>

`;

return;

}


pendingList.innerHTML =
pendingReviews.map(function(review){

return `

<div class="pending-review">

<div>

<h3>${escapeHTML(review.id)}</h3>

<p>

<strong>Customer:</strong>
${escapeHTML(review.name)}

&nbsp; | &nbsp;

<strong>Product:</strong>
${escapeHTML(review.product)}

</p>


<p>

${escapeHTML(review.review)}

</p>


<div class="pending-meta">

<span class="meta-tag">

<i class="fa-solid fa-star"></i>

${review.rating}/5

</span>


<span class="meta-tag">

<i class="fa-solid fa-location-dot"></i>

${escapeHTML(review.city)}

</span>


<span class="meta-tag">

<i class="fa-solid fa-clock"></i>

Pending

</span>

</div>

</div>


<div class="pending-actions">

<button
class="approve-btn"
onclick="approveReview('${review.id}')">

<i class="fa-solid fa-check"></i>

Approve

</button>


<button
class="reject-btn"
onclick="rejectReview('${review.id}')">

<i class="fa-solid fa-xmark"></i>

Reject

</button>

</div>

</div>

`;

}).join("");

}


/* =====================================
   APPROVE REVIEW
===================================== */

function approveReview(id){

const review =
reviews.find(function(item){

return item.id === id;

});


if(!review) return;


review.status = "approved";

review.date = "Recently verified";


saveReviews();

renderReviews();

renderPendingReviews();

showToast(
id +
" approved and published publicly"
);

}


/* =====================================
   REJECT REVIEW
===================================== */

function rejectReview(id){

reviews =
reviews.filter(function(review){

return review.id !== id;

});


saveReviews();

renderPendingReviews();

showToast(
id +
" review rejected"
);

}


/* =====================================
   LIKE REVIEW
===================================== */

function likeReview(button){

button.classList.toggle("liked");


const icon =
button.querySelector("i");


if(button.classList.contains("liked")){

icon.classList.remove("fa-regular");

icon.classList.add("fa-solid");

showToast("Marked as helpful");

}else{

icon.classList.remove("fa-solid");

icon.classList.add("fa-regular");

}

}


/* =====================================
   FAVORITE
===================================== */

function favoriteReview(button){

button.classList.toggle("favorite");


const icon =
button.querySelector("i");


if(button.classList.contains("favorite")){

icon.classList.remove("fa-regular");

icon.classList.add("fa-solid");

showToast("Review saved");

}else{

icon.classList.remove("fa-solid");

icon.classList.add("fa-regular");

}

}


/* =====================================
   MODAL
===================================== */

function openReviewModal(){

document
.getElementById("reviewModal")
.classList.add("show");

}


function closeReviewModal(){

document
.getElementById("reviewModal")
.classList.remove("show");

}


document
.getElementById("reviewModal")
.addEventListener("click",function(event){

if(event.target === this){

closeReviewModal();

}

});


/* =====================================
   TOAST
===================================== */

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


/* =====================================
   START PAGE
===================================== */

renderReviews();

renderPendingReviews();

