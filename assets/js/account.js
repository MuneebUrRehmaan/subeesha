/* =========================================================
   SUBEESHA - ACCOUNT PAGE JAVASCRIPT
   Login, Sign Up, Forgot Password and password visibility.
   This is frontend demo logic; connect these forms to your
   backend/API later for real authentication.
   ========================================================= */

const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const forgotPanel = document.getElementById("forgotPanel");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");

/* ===== SWITCH BETWEEN LOGIN AND SIGN UP ===== */
function showLogin(){
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
    loginForm.classList.add("active");
    signupForm.classList.remove("active");
    forgotPanel.classList.remove("active");
    authTitle.textContent = "Welcome Back";
    authSubtitle.textContent = "Login to continue shopping with Subeesha.";
}

function showSignup(){
    signupTab.classList.add("active");
    loginTab.classList.remove("active");
    signupForm.classList.add("active");
    loginForm.classList.remove("active");
    forgotPanel.classList.remove("active");
    authTitle.textContent = "Create Account";
    authSubtitle.textContent = "Join Subeesha and start shopping better.";
}

/* ===== FORGOT PASSWORD ===== */
function showForgot(){
    loginTab.classList.remove("active");
    signupTab.classList.remove("active");
    loginForm.classList.remove("active");
    signupForm.classList.remove("active");
    forgotPanel.classList.add("active");
    authTitle.textContent = "Forgot Password";
    authSubtitle.textContent = "Enter your email and we will help you reset your password.";
}

function backToLogin(){
    showLogin();
}

/* ===== PASSWORD VISIBILITY ===== */
function togglePassword(inputId, button){
    const input = document.getElementById(inputId);
    if(input.type === "password"){
        input.type = "text";
        button.innerHTML = '<ion-icon name="eye-off-outline"></ion-icon>';
    }else{
        input.type = "password";
        button.innerHTML = '<ion-icon name="eye-outline"></ion-icon>';
    }
}

/* ===== SIGNUP LOCATION (Leaflet map, optional) ===== */
let signupLoc = null;
(function(){
    const f = document.getElementById("signupForm");
    const submit = f && f.querySelector(".auth-submit");
    if(!f || !submit) return;
    const g = document.createElement("div");
    g.className = "form-group";
    g.innerHTML = '<label>Delivery Location <small style="color:#8d9691;font-weight:400">(optional)</small></label>' +
        '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button type="button" id="pickLoc" style="padding:11px 14px;border:1px solid #0e3d34;color:#0e3d34;background:#fff;border-radius:4px;font-weight:600;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit"><ion-icon name="location-outline"></ion-icon> Select on map</button>' +
        '<span id="locText" style="font-size:12px;color:#68736e;flex:1;min-width:150px;line-height:1.5"></span></div>';
    f.insertBefore(g, submit);
    document.getElementById("pickLoc").addEventListener("click", function(){
        if(!window.SUB || !SUB.map) return;
        SUB.map.pick(signupLoc).then(function(r){
            if(!r) return;
            signupLoc = { lat:r.lat, lng:r.lng, address:r.address || "", city:r.city || "", province:r.province || "" };
            document.getElementById("locText").textContent = signupLoc.address || (r.lat.toFixed(4) + ", " + r.lng.toFixed(4));
        }).catch(function(e){ setMessage("signupMessage", "error", "Error: " + e.message); });
    });
})();

/* ===== FIREBASE AUTH (login / sign up / reset) ===== */
function setMessage(elementId, type, text){
    const box = document.getElementById(elementId);
    box.className = "auth-message show " + type;
    box.textContent = text;
}

function needFirebase(id){
    if(window.SUB && SUB.configured) return false;
    setMessage(id, "error", "Error: Firebase is not configured yet. Edit assets/js/firebase-config.js");
    return true;
}

function safeNext(){
    const n = SUB.qs("next") || "";
    // only allow relative same-site paths
    return /^(?!\/\/)(?![a-z]+:)[\w./?=&%#-]+$/i.test(n) ? n : "";
}

function goAfterLogin(profile){
    if(profile.role === "admin") location.href = SUB.url("panel/admin/index.html");
    else if(profile.role === "reseller") location.href = SUB.url("panel/reseller/dashboard.html");
    else location.href = safeNext() || SUB.url("page/profile.html");
}

function setBusy(form, busy){
    const b = form.querySelector('button[type="submit"]');
    if(b){ b.disabled = busy; b.style.opacity = busy ? ".7" : ""; }
}

loginForm.addEventListener("submit", function(event){
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if(!email || !password){
        setMessage("loginMessage", "error", "Error: Please enter your email and password.");
        return;
    }
    if(needFirebase("loginMessage")) return;
    setBusy(loginForm, true);
    SUB.signIn(email, password).then(function(profile){
        setMessage("loginMessage", "success", "Success: Login successful. Redirecting...");
        setTimeout(() => goAfterLogin(profile), 500);
    }).catch(function(e){
        setMessage("loginMessage", "error", "Error: " + SUB.authError(e));
    }).finally(() => setBusy(loginForm, false));
});

signupForm.addEventListener("submit", function(event){
    event.preventDefault();
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const code = (document.getElementById("countryCode") || {}).value || "";
    const phone = document.getElementById("signupWhatsapp").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("signupConfirm").value;

    if(!name || !email || !password || !confirm || !phone){
        setMessage("signupMessage", "error", "Error: Please complete all required fields.");
        return;
    }
    if(password.length < 6){
        setMessage("signupMessage", "error", "Error: Password must be at least 6 characters.");
        return;
    }
    if(password !== confirm){
        setMessage("signupMessage", "error", "Error: Passwords do not match.");
        return;
    }
    if(needFirebase("signupMessage")) return;
    setBusy(signupForm, true);
    SUB.signUp({ name: name, email: email, password: password, whatsapp: (code + " " + phone).trim(), location: signupLoc }).then(function(){
        setMessage("signupMessage", "success", "Success: Account created. Redirecting...");
        setTimeout(() => goAfterLogin(SUB.profile || { role: "customer" }), 600);
    }).catch(function(e){
        setMessage("signupMessage", "error", "Error: " + SUB.authError(e));
    }).finally(() => setBusy(signupForm, false));
});

const forgotForm = document.getElementById("forgotForm");
forgotForm.addEventListener("submit", function(event){
    event.preventDefault();
    const email = document.getElementById("forgotEmail").value.trim();
    if(!email){
        setMessage("forgotMessage", "error", "Error: Please enter your email address.");
        return;
    }
    if(needFirebase("forgotMessage")) return;
    SUB.resetPassword(email).then(function(){
        setMessage("forgotMessage", "success", "Success: Password reset link sent. Check your email inbox.");
    }).catch(function(e){
        setMessage("forgotMessage", "error", "Error: " + SUB.authError(e));
    });
});

/* Already logged in? go straight to the right place */
if(window.SUB){
    SUB.onAuth(function(user, profile){
        if(user && profile && !SUB.qs("stay")) goAfterLogin(profile);
        else if(SUB.blocked) setMessage("loginMessage", "error", "Error: Your account has been blocked or suspended.");
    });
}
