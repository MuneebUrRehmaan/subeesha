
/* =========================
   DEFAULT REVIEWS
========================= */

const defaultReviews = [

{
    id:"SUB-1001",
    name:"Ayesha Khan",
    product:"Elegant Summer Dress",
    rating:5,
    review:"The product quality was excellent and delivery was faster than expected. The whole shopping experience was simple and smooth.",
    image:null,
    status:"approved",
    date:"2 days ago"
},

{
    id:"SUB-1002",
    name:"Ali Raza",
    product:"Premium Wireless Headphones",
    rating:5,
    review:"Very satisfied with my order. The product was exactly as shown and the packaging was very professional.",
    image:null,
    status:"approved",
    date:"5 days ago"
},

{
    id:"SUB-1003",
    name:"Fatima Noor",
    product:"Glow Skincare Collection",
    rating:4,
    review:"Loved the product and the quality was really good. I would definitely recommend Subeesha to my friends and family.",
    image:null,
    status:"approved",
    date:"1 week ago"
},

{
    id:"SUB-1004",
    name:"Ahmed Shah",
    product:"Modern Home Decor Set",
    rating:5,
    review:"Amazing service from ordering to delivery. Everything arrived safely and customer support was very helpful.",
    image:null,
    status:"approved",
    date:"1 week ago"
},

{
    id:"SUB-1005",
    name:"Sana Malik",
    product:"Luxury Makeup Kit",
    rating:4,
    review:"The shopping process was easy and I really liked the clean website. The product was beautiful and worth the price.",
    image:null,
    status:"approved",
    date:"2 weeks ago"
},

{
    id:"SUB-1006",
    name:"Usman Ahmed",
    product:"Smart Fitness Watch",
    rating:5,
    review:"Great experience overall. The delivery was on time and the product quality was better than I expected.",
    image:null,
    status:"approved",
    date:"3 weeks ago"
}

];


/* =========================
   LOAD REVIEWS (Firestore: only approved reviews are public)
========================= */
let reviews = (window.SUB && SUB.configured) ? [] : defaultReviews;

function loadReviewsFromDb(){
    return SUB.db.collection("reviews").where("status","==","approved").get().then(function(snap){
        reviews = SUB.docs(snap).map(function(r){
            r.date = SUB.date(r.createdAt);
            return r;
        }).sort(function(a,b){ return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); });
        renderReviews();
if(window.SUB && SUB.configured){ loadReviewsFromDb(); }
    }).catch(function(){ renderReviews(); });
}

/* =========================
   MOBILE MENU
========================= */

function toggleMenu(){

    document
    .getElementById("navLinks")
    .classList.toggle("show");

}


/* =========================
   STARS
========================= */

function getStars(rating){

    let stars = "";

    for(let i = 1; i <= 5; i++){

        stars += i <= rating ? "★" : "☆";

    }

    return stars;

}


/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(value){

    const div =
    document.createElement("div");

    div.textContent =
    value || "";

    return div.innerHTML;

}


/* =========================
   RENDER PUBLIC REVIEWS
========================= */

function renderReviews(){

    const grid =
    document.getElementById("reviewsGrid");

    const search =
    document
    .getElementById("reviewSearch")
    .value
    .toLowerCase()
    .trim();

    const filter =
    document
    .getElementById("ratingFilter")
    .value;


    const approved =
    reviews.filter(function(review){

        return review.status === "approved";

    });


    const filtered =
    approved.filter(function(review){

        const searchable =
        (
            review.name + " " +
            review.id + " " +
            review.product + " " +
            review.review
        )
        .toLowerCase();


        const searchMatch =
        search === "" ||
        searchable.includes(search);


        const ratingMatch =
        filter === "all" ||
        String(review.rating) === filter;


        return searchMatch && ratingMatch;

    });


    if(filtered.length === 0){

        grid.innerHTML = `

        <div class="empty-state">

            <i class="fa-regular fa-face-smile"
            style="font-size:35px;color:#d6a85f"></i>

            <br><br>

            <h3>No Reviews Found</h3>

            <br>

            <p>
                Try another search or rating filter.
            </p>

        </div>

        `;

        updateRatingSummary();

        return;

    }


    grid.innerHTML =
    filtered.map(function(review){

        return `

        <article class="review-card">

            <div class="review-top">

                <div class="customer-info">

                    <div class="customer-avatar">

                        <i class="fa-solid fa-user"></i>

                    </div>


                    <div>

                        <h3>
                            ${escapeHTML(review.name)}
                        </h3>

                        <div class="customer-id">

                            ${escapeHTML(review.id)}
                            • Verified Customer

                        </div>

                    </div>

                </div>


                <span class="verified">

                    <i class="fa-solid fa-circle-check"></i>

                    Verified

                </span>

            </div>


            <div class="review-stars">

                ${getStars(review.rating)}

            </div>


            <p class="review-text">

                ${escapeHTML(review.review)}

            </p>


            <div class="product-box">

                <i class="fa-solid fa-bag-shopping"></i>

                Purchased:
                ${escapeHTML(review.product)}

            </div>


            ${
                review.image
                ?
                `
                <img
                    src="${escapeHTML(SUB.img(review.image, 700))}"
                    class="review-image"
                    alt="Customer uploaded image">
                `
                :
                ""
            }


            <div class="review-footer">

                <span class="review-date">

                    ${escapeHTML(review.date)}

                </span>


                <button
                    class="helpful-btn"
                    onclick="toggleHelpful(this)">

                    <i class="fa-regular fa-thumbs-up"></i>

                    Helpful

                </button>

            </div>

        </article>

        `;

    }).join("");


    updateRatingSummary();

}


/* =========================
   RATING SUMMARY
========================= */

function updateRatingSummary(){

    const approved =
    reviews.filter(function(review){

        return review.status === "approved";

    });


    const total =
    approved.length;


    if(total === 0){

        document
        .getElementById("averageRating")
        .textContent = "0.0";


        document
        .getElementById("averageStars")
        .textContent = "☆☆☆☆☆";


        document
        .getElementById("reviewCount")
        .textContent =
        "No verified reviews yet";


        for(let i = 1; i <= 5; i++){

            document
            .getElementById("bar" + i)
            .style.width = "0%";


            document
            .getElementById("percent" + i)
            .textContent = "0%";

        }

        return;

    }


    const totalRating =
    approved.reduce(function(sum,review){

        return sum + Number(review.rating);

    },0);


    const average =
    totalRating / total;


    document
    .getElementById("averageRating")
    .textContent =
    average.toFixed(1);


    document
    .getElementById("averageStars")
    .textContent =
    getStars(Math.round(average));


    document
    .getElementById("reviewCount")
    .textContent =
    "Based on " +
    total +
    " verified customer review" +
    (total > 1 ? "s" : "");


    for(let star = 1; star <= 5; star++){

        const count =
        approved.filter(function(review){

            return Number(review.rating) === star;

        }).length;


        const percentage =
        Math.round(
            (count / total) * 100
        );


        document
        .getElementById("bar" + star)
        .style.width =
        percentage + "%";


        document
        .getElementById("percent" + star)
        .textContent =
        percentage + "%";

    }

}


/* =========================
   IMAGE PREVIEW
========================= */

let uploadedImage = null;   // preview data URL
let uploadedFile = null;    // file sent to Cloudinary on submit

function previewReviewImage(event){
    const file = event.target.files[0];
    if(!file) return;
    const err = SUB.cloud.valid(file);
    if(err){
        alert(err);
        event.target.value = "";
        return;
    }
    uploadedFile = file;
    const reader = new FileReader();
    reader.onload = function(e){
        uploadedImage = e.target.result;
        const preview = document.getElementById("imagePreview");
        preview.src = uploadedImage;
        preview.style.display = "block";
        document.getElementById("uploadPlaceholder").style.display = "none";
    };
    reader.readAsDataURL(file);
}

/* =========================
   SUBMIT REVIEW
   Requires a signed-in customer. The order ID is checked
   against the customer's own DELIVERED orders.
========================= */
let submittingReview = false;

function submitReview(event){
    event.preventDefault();
    const form = event.target;
    if(!SUB.configured){
        alert("The store is not connected to Firebase yet.");
        return;
    }
    if(!SUB.user || !SUB.profile){
        alert("Please login to write a review.");
        location.href = "../account.html?next=" + encodeURIComponent("page/customer-love.html");
        return;
    }
    if(submittingReview) return;
    const val = id => document.getElementById(id).value.trim();
    const orderId = val("customerOrder").toUpperCase().replace(/^#/, "");
    const data = {
        uid: SUB.user.uid,
        name: val("customerName"), email: val("customerEmail"), phone: val("customerPhone"),
        orderId: orderId, product: val("customerProduct"),
        rating: Number(document.getElementById("customerRating").value),
        review: val("customerReview"),
        image: null, status: "pending", createdAt: SUB.now()
    };
    if(!data.rating || !data.review){
        alert("Please choose a rating and write your review.");
        return;
    }
    submittingReview = true;
    const btn = form.querySelector('button[type="submit"]');
    if(btn){ btn.disabled = true; btn.style.opacity = ".7"; }

    SUB.db.collection("orders").doc(orderId).get().then(function(s){
        if(!s.exists || s.data().userId !== SUB.user.uid) throw new Error("We could not find this order on your account.");
        if(s.data().status !== "Delivered") throw new Error("You can review an order after it has been delivered.");
        return uploadedFile ? SUB.cloud.upload(uploadedFile, { folder: "reviews" }) : null;
    }).then(function(img){
        if(img) data.image = img.url;
        const counter = SUB.db.collection("counters").doc("reviews");
        return SUB.db.runTransaction(function(tx){
            return tx.get(counter).then(function(c){
                const n = c.exists ? c.data().n + 1 : 1001;
                tx.set(counter, { n: n });
                tx.set(SUB.db.collection("reviews").doc("SUB-" + n), data);
                return "SUB-" + n;
            });
        });
    }).then(function(reviewID){
        form.reset();
        uploadedImage = null; uploadedFile = null;
        document.getElementById("imagePreview").src = "";
        document.getElementById("imagePreview").style.display = "none";
        document.getElementById("uploadPlaceholder").style.display = "flex";
        closeReviewModal();
        document.getElementById("successReviewId").textContent = reviewID;
        document.getElementById("successModal").classList.add("show");
    }).catch(function(e){
        alert((e && e.code === "permission-denied") ? "You do not have permission to submit this review." : (e.message || "Could not submit your review."));
    }).finally(function(){
        submittingReview = false;
        if(btn){ btn.disabled = false; btn.style.opacity = ""; }
    });
}

/* =========================
   HELPFUL BUTTON
========================= */

function toggleHelpful(button){

    button.classList.toggle("active");


    const icon =
    button.querySelector("i");


    if(button.classList.contains("active")){

        icon.classList.remove("fa-regular");

        icon.classList.add("fa-solid");

    }else{

        icon.classList.remove("fa-solid");

        icon.classList.add("fa-regular");

    }

}


/* =========================
   SEARCH FROM HEADER
========================= */

function searchReviews(){

    const value =
    document
    .getElementById("headerSearch")
    .value;


    document
    .getElementById("reviewSearch")
    .value =
    value;


    renderReviews();
if(window.SUB && SUB.configured){ loadReviewsFromDb(); }


    document
    .getElementById("reviewsGrid")
    .scrollIntoView({

        behavior:"smooth",

        block:"start"

    });

}


/* =========================
   REVIEW MODAL
========================= */

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
.addEventListener(
    "click",
    function(event){

        if(event.target === this){

            closeReviewModal();

        }

    }
);


/* =========================
   SUCCESS MODAL
========================= */

function closeSuccessModal(){

    document
    .getElementById("successModal")
    .classList.remove("show");

}


/* =========================
   INITIALIZE
========================= */

renderReviews();
if(window.SUB && SUB.configured){ loadReviewsFromDb(); }

