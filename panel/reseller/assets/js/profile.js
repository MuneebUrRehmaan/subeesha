/* Reseller - profile */
R.ready(function () {
    var large = document.querySelector(".profile-large"); if (!large || !SUB.configured) return;
    var p = R.me;
    large.querySelector(".avatar").textContent = SUB.initials(p.name);
    large.querySelector("h2").textContent = p.name || "";
    var badge = document.querySelector(".verified-badge"); if (badge) badge.style.display = p.status === "active" ? "" : "none";
    var inputs = document.querySelectorAll(".profile-details input");
    inputs[0].value = p.name || ""; inputs[1].value = p.email || ""; inputs[1].readOnly = true; inputs[2].value = p.phone || p.whatsapp || "";
    var btn = document.querySelector(".save-profile");
    btn.setAttribute("onclick", "R.saveProfile()");
    R.saveProfile = function () {
        var name = inputs[0].value.trim(), phone = inputs[2].value.trim();
        if (!name) return R.toast("Name is required.");
        SUB.db.collection("users").doc(p.id).update({ name: name, phone: phone, whatsapp: phone }).then(function () { R.toast("Profile updated successfully!"); }).catch(R.err);
    };
});
