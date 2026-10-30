/* ======================================
   LOYALTY CONFIGURATION
====================================== */
const TOTAL_STAMPS = 10;

/* ======================================
   STATE (loaded from Firestore)
   stamps  = purchases used - (10 x claims)
   rules only allow a stamp for a DELIVERED order that
   belongs to the signed-in customer, one stamp per order.
====================================== */
let loyaltyData = { stamps: 0, usedPurchases: [], activity: [], rewardAvailable: false };
let loyaltyUser = null;

const esc = v => SUB.esc(v);

function loadLoyalty(){
    return Promise.all([
        SUB.db.collection("loyaltyUsed").where("uid", "==", loyaltyUser.id).get(),
        SUB.db.collection("loyaltyClaims").where("uid", "==", loyaltyUser.id).get()
    ]).then(function(r){
        const used = SUB.docs(r[0]).sort((a, b) => SUB.ms(b.createdAt) - SUB.ms(a.createdAt));
        const claims = SUB.docs(r[1]).sort((a, b) => SUB.ms(b.createdAt) - SUB.ms(a.createdAt));
        loyaltyData.usedPurchases = used.map(x => x.id);
        loyaltyData.stamps = Math.max(0, Math.min(TOTAL_STAMPS, used.length - TOTAL_STAMPS * claims.length));
        const act = used.map(x => ({ id: x.id, status: "Stamp Added", type: "success", date: SUB.dateTime(x.createdAt), t: SUB.ms(x.createdAt) }))
            .concat(claims.map(x => ({ id: "REWARD-CLAIM", status: x.status === "Pending" ? "Reward Requested" : "Reward " + x.status, type: "success", date: SUB.dateTime(x.createdAt), t: SUB.ms(x.createdAt) })))
            .sort((a, b) => b.t - a.t).slice(0, 8);
        loyaltyData.activity = act;
        renderStamps(); renderActivity();
    });
}

/* ======================================
   RENDER STAMPS
====================================== */
function renderStamps(){
    const container = document.getElementById("stampsContainer");
    container.innerHTML = "";
    for(let i = 1; i <= TOTAL_STAMPS; i++){
        const stamp = document.createElement("div");
        stamp.classList.add("stamp");
        if(i <= loyaltyData.stamps){
            stamp.classList.add("active");
            stamp.innerHTML = `<span class="stamp-icon"><i class="fa-solid fa-check"></i></span><span class="stamp-number">STAMP ${i}</span><small class="stamp-status">COMPLETED</small>`;
        }else{
            if(i === loyaltyData.stamps + 1) stamp.classList.add("next");
            stamp.innerHTML = `<span class="stamp-icon"><i class="fa-regular fa-star"></i></span><span class="stamp-number">STAMP ${i}</span><small class="stamp-status">AVAILABLE</small>`;
        }
        container.appendChild(stamp);
    }
    document.getElementById("stampCount").textContent = loyaltyData.stamps;
    const percentage = (loyaltyData.stamps / TOTAL_STAMPS) * 100;
    document.getElementById("progressBar").style.width = percentage + "%";
    document.getElementById("progressText").textContent = Math.round(percentage) + "% Complete";
    updateReward();
}

/* ======================================
   UPDATE REWARD
====================================== */
function updateReward(){
    const rewardTitle = document.getElementById("rewardTitle");
    const rewardText = document.getElementById("rewardText");
    const claimBtn = document.getElementById("claimBtn");
    if(loyaltyData.stamps >= TOTAL_STAMPS){
        loyaltyData.rewardAvailable = true;
        rewardTitle.textContent = "Reward Unlocked!";
        rewardText.textContent = "Congratulations! Your loyalty reward is now available.";
        claimBtn.textContent = "Claim Your Reward";
        claimBtn.classList.add("active");
    }else{
        loyaltyData.rewardAvailable = false;
        const remaining = TOTAL_STAMPS - loyaltyData.stamps;
        rewardTitle.textContent = "Reward Locked";
        rewardText.textContent = remaining + " more eligible purchase(s) required.";
        claimBtn.textContent = "Complete Stamps First";
        claimBtn.classList.remove("active");
    }
}

/* ======================================
   APPLY STAMP
====================================== */
let stamping = false;
function applyStamp(){
    const input = document.getElementById("purchaseId");
    const purchaseId = input.value.trim().toUpperCase().replace(/^#/, "");

    if(!purchaseId){
        showToast("Purchase ID Required", "Please scan or enter a valid Purchase ID.", "error");
        return;
    }
    if(!SUB.configured){
        showToast("Not connected", "Firebase is not configured yet.", "error");
        return;
    }
    if(!/^SUB-\d+$/.test(purchaseId)){
        showToast("Invalid ID", "Purchase IDs look like SUB-10842.", "error");
        return;
    }
    if(loyaltyData.usedPurchases.includes(purchaseId)){
        showToast("Already Applied", "This purchase has already been used for a loyalty stamp.", "error");
        input.value = "";
        return;
    }
    if(loyaltyData.stamps >= TOTAL_STAMPS){
        showToast("Card Already Complete", "Please claim your reward before starting a new loyalty card.", "error");
        return;
    }
    if(stamping) return;
    stamping = true;

    SUB.db.collection("orders").doc(purchaseId).get().then(function(s){
        if(!s.exists || s.data().userId !== loyaltyUser.id){
            throw new Error("We could not find this purchase on your account.");
        }
        if(s.data().status !== "Delivered"){
            throw new Error("This order has not been delivered yet. Stamps are added after delivery.");
        }
        return SUB.db.collection("loyaltyUsed").doc(purchaseId).set({
            uid: loyaltyUser.id, orderNo: purchaseId, createdAt: SUB.now()
        });
    }).then(function(){
        return loadLoyalty();
    }).then(function(){
        showToast("Stamp Added!", "Purchase " + purchaseId + " successfully added to your loyalty card.", "success");
        input.value = "";
    }).catch(function(e){
        const msg = (e && e.code === "permission-denied") ? "This purchase cannot be used for a stamp." : (e.message || "Could not add stamp.");
        showToast("Could not add stamp", msg, "error");
    }).finally(function(){ stamping = false; });
}

function renderActivity(){
    const activityList = document.getElementById("activityList");
    if(loyaltyData.activity.length === 0){
        activityList.innerHTML = `<p style="color:#68736e;font-size:12px;margin-top:20px;">No purchases scanned yet.</p>`;
        return;
    }
    activityList.innerHTML = loyaltyData.activity.map(function(item){
        return `
        <div class="activity-item">
            <div class="activity-left">
                <div class="activity-icon"><i class="${item.type === "success" ? "fa-solid fa-circle-check" : "fa-solid fa-circle-exclamation"}"></i></div>
                <div><h4>${esc(item.id)}</h4><p>${esc(item.date)}</p></div>
            </div>
            <span class="status ${esc(item.type)}">${esc(item.status)}</span>
        </div>`;
    }).join("");
}

/* ======================================
   TOAST
====================================== */
let toastTimer;
function showToast(
    title,
    message,
    type
){
    const toast =
        document.getElementById("toast");
    const toastTitle =
        document.getElementById("toastTitle");
    const toastMessage =
        document.getElementById("toastMessage");
    const toastIcon =
        document.getElementById("toastIcon");
    toast.classList.remove("error");
    toastIcon.innerHTML = type === "error"
        ? '<i class="fa-solid fa-circle-exclamation"></i>'
        : '<i class="fa-solid fa-circle-check"></i>';
    if(type === "error") toast.classList.add("error");
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){
        toast.classList.remove("show");
    },4000);
}
/* ======================================
   CLAIM REWARD
====================================== */
function claimReward(){
    if(!loyaltyData.rewardAvailable){
        showToast("Reward Locked", "Complete all loyalty stamps first.", "error");
        return;
    }
    if(stamping) return;
    stamping = true;
    SUB.db.collection("loyaltyClaims").add({
        uid: loyaltyUser.id, name: loyaltyUser.name || "", email: loyaltyUser.email || "",
        status: "Pending", createdAt: SUB.now()
    }).then(function(){
        document.getElementById("rewardModal").classList.add("show");
        return loadLoyalty();
    }).catch(function(e){
        showToast("Error", SUB.authError(e), "error");
    }).finally(function(){ stamping = false; });
}
function closeRewardModal(){
    document.getElementById("rewardModal").classList.remove("show");
    showToast("New Card Started", "Your reward request was sent and a new loyalty card has started.", "success");
}

/* ======================================
   FOCUS INPUT
====================================== */
function focusPurchaseInput(){
    document
        .getElementById("purchaseId")
        .focus();
}
/* ======================================
   ENTER KEY
====================================== */
document
.getElementById("purchaseId")
.addEventListener(
    "keypress",
    function(e){
        if(e.key === "Enter"){
            applyStamp();
        }
    }
);
/* ======================================
   INITIAL LOAD
====================================== */
renderStamps();
renderActivity();
if(SUB.configured){
    SUB.ready.then(function(r){
        if(!r.user || !r.profile){
            location.href = "../account.html?next=" + encodeURIComponent("page/loyalty.html");
            return;
        }
        loyaltyUser = r.profile;
        loadLoyalty().catch(function(){});
    });
}
