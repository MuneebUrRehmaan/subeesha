# Subeesha - Firebase + Cloudinary Setup

Full stack: plain HTML/CSS/JavaScript + Firebase (Auth + Firestore) + Cloudinary (images). No PHP, no server.

## 1. Create a Firebase project
1. https://console.firebase.google.com -> Add project.
2. Build > Authentication > Sign-in method > enable **Email/Password**.
3. Build > Firestore Database > Create database (production mode, any region close to Pakistan e.g. asia-south1).
4. Project settings > General > Your apps > Web app (</>) > register it > copy the `firebaseConfig` object.
5. Paste those values into `assets/js/firebase-config.js` (`window.SUBEESHA_FIREBASE`).

## 2. Deploy the security rules
Using the Firebase CLI (`npm i -g firebase-tools`, then `firebase login`):
```
firebase use --add        # pick your project
firebase deploy --only firestore:rules
```
Or paste the contents of `firestore.rules` into Firestore > Rules in the console and Publish.
**Test the rules in the Rules Playground before going live** - they were written and syntax-checked here but the emulator could not be run in this environment (network is blocked), so they have not been executed against real Firestore yet.

## 3. Create a Cloudinary account
1. https://cloudinary.com -> free account -> copy your **Cloud name**.
2. Settings > Upload > Upload presets > Add upload preset > Signing Mode = **Unsigned** > Save. Copy the preset name.
3. Paste both into `assets/js/firebase-config.js` (`window.SUBEESHA_CLOUDINARY`).

## 4. Create your first admin account (one-time, manual)
There is no server, so the very first admin has to be created by hand:
1. Firebase Console > Authentication > Add user (email + password).
2. Firestore Database > Start collection `users` > Document ID = the new user's **UID** (copy it from the Authentication tab) with these fields:
   - `name` (string) - your name
   - `email` (string) - same email as the Auth user
   - `role` (string) = `admin`
   - `adminRole` (string) = `Super Admin`
   - `status` (string) = `active`
   - `access` (string) = `Allowed`
   - `points` (number) = `0`
   - `wallet` (number) = `0`
   - `walletUsed` (number) = `0`
3. Open `panel/admin/login.html` and sign in.

Every other admin, reseller or staff account can then be created **from inside the Admin Panel** (Users page / Resellers page) - it generates a login automatically and shows the one-time password.

## 5. Load some starter content
Open Admin Panel > Dashboard (or Settings) as Super Admin/Manager and click **Import Demo Data**. This loads the categories, products, banners and coupons that were originally hard-coded in the design, so the store isn't empty on first run.

## 6. Hosting
Any static host works (Firebase Hosting, Netlify, Vercel, a shared host). `firebase.json` is already set up for `firebase deploy --only hosting`.

## Roles
| Role | Can access |
|---|---|
| Super Admin | Everything, including Users & role changes |
| Manager | Everything except Users |
| Staff | Products, Categories, Customers, Inventory, Giveaway, Banners, Reviews, Orders |
| Delivery Manager | Orders only (can mark Shipped) |
| Reseller | Reseller panel only (own dashboard/products/orders/commission/withdraw/profile) |
| Customer | Storefront + their own profile |

## What still needs real testing
Because outbound network to Firebase/Cloudinary is blocked in the environment this was built in, none of this has been run against a live Firebase project yet - only `node --check` syntax validation and a static link check were possible. Before you rely on it:
- Walk through: sign up -> add to cart -> checkout -> admin marks Delivered -> check stock/wallet/points changed correctly.
- Test the Firestore rules in the Rules Playground, especially order status transitions and the reseller/admin creation flow (uses a secondary Firebase Auth app instance so the admin doesn't get signed out).
- Confirm Cloudinary uploads work with your unsigned preset (some Cloudinary accounts restrict unsigned uploads to specific folders).


---
## v3 additions (read this after deploying)

### 1. RE-PUBLISH `firestore.rules` (important)
Orders were failing with "no permission" because customers could not read the order counter. The updated rules fix this
(and let every admin role adjust stock/points, and let the site write order emails). Firebase Console > Firestore > Rules > paste `firestore.rules` > **Publish**.

### 2. Delivery charges (Admin > Shipping)
Three methods, switch any time:
- **Flat rate** - one charge for all orders.
- **By city (manual)** - a charge per city (checkout city list now has ~70 Pakistani cities) + a default for other cities.
- **By map zones (auto)** - search or click on the map to add a zone (e.g. Hyderabad, radius 10 km, Rs. 150). A customer inside a zone pays that zone's charge; outside every zone pays the default. If the customer pinned a location it is used, otherwise the selected city is geocoded automatically.
"Free delivery above" works with every method.
Customers can pin their location on a Leaflet/OpenStreetMap map at **signup** (optional) and at **checkout**.
Maps use OpenStreetMap tiles and Nominatim search (free, no API key; fair-use limits apply).

### 3. Order emails (Admin > Settings > Email Notifications)
Master ON/OFF switch plus separate switches for: email to customer on order, alert to admin on new order, status-change emails.
Two services:
- **EmailJS** (no billing needed; sends through your Gmail). Follow the 5-minute box shown in Settings.
- **Firebase Trigger Email extension** (needs Blaze plan): site writes to the `mail` collection, the extension sends via your Gmail/SMTP.
Use "Send test email" to verify. EmailJS keys are public by design; add your domain to EmailJS allowed origins.

### 4. Reseller money flow
Commission is credited to the reseller wallet when an order is **Delivered** and taken back if it is **Returned**.
Withdrawals are deducted from the wallet when admin presses **Mark Paid**; pending requests are reserved in the reseller's available balance.

### 5. Other
- One navbar (copied from the home page) on every storefront page, with mobile search overlay, recent searches and live suggestions.
- All corners are max 4px (circles/avatars stay round). Label/invoice is A6 and click-to-edit before printing.
