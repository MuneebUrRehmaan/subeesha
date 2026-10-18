/* =========================================================
   SUBEESHA GIVEAWAY PAGE
   Active giveaway, prizes, winners and participation are
   stored in Firestore (giveaways / giveawayEntries).
   ========================================================= */
let activeGiveaway = null;
let giveawayTimer = null;
const gEsc = v => SUB.esc(v);
const pad2 = n => String(n).padStart(2, "0");

function setCountdown(t){
    document.getElementById("days").textContent = pad2(t.days);
    document.getElementById("hours").textContent = pad2(t.hours);
    document.getElementById("minutes").textContent = pad2(t.minutes);
    document.getElementById("seconds").textContent = pad2(t.seconds);
}

function startCountdown(endMs){
    clearInterval(giveawayTimer);
    giveawayTimer = SUB.countdown(endMs, setCountdown);
}

function noGiveaway(){
    const hero = document.querySelector(".giveaway-hero-content");
    if(hero){
        hero.querySelector("h1").innerHTML = 'No Active Giveaway.<br><span>Stay Tuned!</span>';
        hero.querySelector("p").textContent = "Our next Subeesha giveaway is coming soon. Follow us on Instagram to be the first to know.";
        const btns = hero.querySelector(".giveaway-buttons"); if(btns) btns.style.display = "none";
    }
    ["participate", "prizes"].forEach(id => { const e = document.getElementById(id); if(e) e.style.display = "none"; });
    const cd = document.querySelector(".giveaway-countdown-wrap"); if(cd) cd.style.display = "none";
}

function renderGiveaway(g){
    const hero = document.querySelector(".giveaway-hero-content");
    const parts = String(g.title || "Win Amazing Prizes").split("|");
    hero.querySelector("h1").innerHTML = gEsc(parts[0].trim()) + (parts[1] ? "<br><span>" + gEsc(parts[1].trim()) + "</span>" : "");
    if(g.description) hero.querySelector("p").textContent = g.description;
    if(g.banner){
        const bg = document.querySelector(".giveaway-hero");
        bg.style.backgroundImage = "linear-gradient(90deg,rgba(7,38,32,.92),rgba(14,61,52,.55)),url('" + SUB.img(g.banner, 1800).replace(/'/g, "%27") + "')";
        bg.style.backgroundSize = "cover"; bg.style.backgroundPosition = "center";
    }
    startCountdown(SUB.ms(g.endDate));

    const grid = document.querySelector(".prizes-grid");
    if(grid && (g.prizes || []).length){
        grid.innerHTML = g.prizes.map(p => `
        <article class="prize-card">
            <div class="prize-image"><img src="${gEsc(SUB.img(p.image, 900))}" alt="${gEsc(p.name)}" loading="lazy"></div>
            <div class="prize-info">
                <span class="prize-position"><i class="fa-solid fa-trophy"></i> ${gEsc(p.position || "PRIZE")}</span>
                <h3>${gEsc(p.name)}</h3>
                <p>${gEsc(p.description || "")}</p>
            </div>
        </article>`).join("");
    }
}

function renderWinners(list){
    const sec = document.querySelector(".winners-section");
    const box = document.querySelector(".winners");
    if(!sec || !box) return;
    if(!list.length){ sec.style.display = "none"; return; }
    box.innerHTML = list.slice(0, 6).map(w => `
        <div class="winner-card">
            <div class="winner-avatar">${gEsc(SUB.initials(w.name))}</div>
            <h3>${gEsc(w.name)}</h3><p>${gEsc(w.city || "")}</p>
            <span class="winner-prize">${gEsc(w.prize || "Winner")}</span>
        </div>`).join("");
}

function showParticipationMessage(message){
    document.getElementById("successMessage").textContent = message;
    document.getElementById("successOverlay").classList.add("show");
}
function closeSuccessModal(){
    document.getElementById("successOverlay").classList.remove("show");
}
document.getElementById("successOverlay").addEventListener("click", function(event){
    if(event.target === this) closeSuccessModal();
});

function initGiveaway(){
    if(!SUB.configured){
        // static demo mode
        startCountdown(new Date("2026-12-31T23:59:59").getTime());
        return;
    }
    SUB.db.collection("giveaways").get().then(snap => {
        const all = SUB.docs(snap);
        const now = Date.now();
        const live = all.filter(g => g.status === "Active" && SUB.ms(g.endDate) > now && SUB.ms(g.startDate) <= now)
            .sort((a, b) => SUB.ms(b.createdAt) - SUB.ms(a.createdAt));
        activeGiveaway = live[0] || null;
        const winners = [];
        all.filter(g => g.status !== "Draft").sort((a, b) => SUB.ms(b.endDate) - SUB.ms(a.endDate))
            .forEach(g => (g.winners || []).forEach(w => winners.push(w)));
        renderWinners(winners);
        if(activeGiveaway) renderGiveaway(activeGiveaway); else noGiveaway();
    }).catch(() => noGiveaway());
}

document.addEventListener("DOMContentLoaded", function(){
    initGiveaway();
    const form = document.getElementById("giveawayForm");
    form.addEventListener("submit", function(event){
        event.preventDefault();
        const fullName = document.getElementById("fullName").value.trim();
        const email = document.getElementById("email").value.trim().toLowerCase();
        const phone = document.getElementById("phone").value.trim();
        const city = document.getElementById("city").value;
        const instagramUsername = document.getElementById("instagramUsername").value.trim();
        const instagramLink = document.getElementById("instagramLink").value.trim();

        if(!SUB.configured){
            const key = "subeesha_giveaway_" + email;
            if(localStorage.getItem(key)) return showParticipationMessage("You have already participated in this giveaway using this email address.");
            localStorage.setItem(key, "1");
            form.reset();
            return showParticipationMessage("Congratulations " + fullName + "! Your giveaway participation has been submitted successfully.");
        }
        if(!activeGiveaway) return showParticipationMessage("Sorry, there is no active giveaway right now.");
        if(!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) return showParticipationMessage("Please enter a valid email address.");

        const emailKey = SUB.emailKey(email);
        const btn = form.querySelector('button[type="submit"]');
        if(btn) btn.disabled = true;
        // doc id = giveawayId_emailKey -> Firestore rules allow only ONE entry per email
        SUB.db.collection("giveawayEntries").doc(activeGiveaway.id + "_" + emailKey).set({
            giveawayId: activeGiveaway.id, emailKey: emailKey, fullName: fullName, email: email,
            phone: phone, city: city, instagramUsername: instagramUsername, instagramLink: instagramLink,
            createdAt: SUB.now()
        }).then(() => {
            showParticipationMessage("Congratulations " + fullName + "! Your giveaway participation has been submitted successfully. Please make sure you have followed and mentioned the official Subeesha Instagram page.");
            form.reset();
        }).catch(e => {
            if(e && e.code === "permission-denied") showParticipationMessage("You have already participated in this giveaway using this email address.");
            else showParticipationMessage("Something went wrong. Please try again.");
        }).finally(() => { if(btn) btn.disabled = false; });
    });
});
