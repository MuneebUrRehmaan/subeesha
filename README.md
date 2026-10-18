# Subeesha Customer Website

## Proper Frontend Structure

```text
Subeesha/
├── index.html
├── profile.html                 # Existing profile page - not created or modified here
├── README.md
└── assets/
    ├── css/
    │   └── style.css
    ├── js/
    │   └── main.js
    └── images/
        └── logo.jpg
```

### Notes
- `index.html` uses external `assets/css/style.css` and `assets/js/main.js`.
- The account icon links to the existing `profile.html`; that page is intentionally not included.
- All current Unsplash/CDN images are temporary frontend design placeholders.
- Comments are included above sections and CDN image locations for easier development.
- Future Admin Panel image uploads should support PNG, JPG, JPEG, WEBP, GIF, AVIF, SVG, BMP and TIFF.
- The Subeesha logo is stored in `assets/images/logo.jpg`.
- Ionicons remain loaded from the existing CDN scripts.

## Account Page
- `account.html` provides Login, Sign Up, and Forgot Password UI.
- `assets/css/account.css` contains account-page styling.
- `assets/js/account.js` contains account-page interactions.
- The forms currently use frontend demo validation only. Connect them to the backend/API later for real authentication.
- The header Account icon in `index.html` links to `account.html`.


Bilkul 👍 Main aapke Subeesha theme ke according ek complete Digital Loyalty Card page bana raha hoon — HTML + CSS + JavaScript sab aik hi file mein.

Is system ka concept ye hoga:

Customer ke paas digital loyalty card hoga
Example: 10 stamps complete karo
Har eligible purchase par QR/Customer Code scan hoga
Scan hone ke baad 1 stamp add hoga
Same Purchase ID dobara scan karne par stamp add nahi hoga
Already applied purchase par message: “This purchase has already been used.”
Sare stamps complete hone par Reward Unlocked
Reward claim karne ke baad naya loyalty card cycle start ho sakta hai
Demo ke liye browser localStorage use hoga, isliye refresh ke baad bhi data rahega