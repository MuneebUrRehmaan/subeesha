# Subeesha – Requested Storefront and Reviews Update

This update is based on the Subeesha project ZIP that already includes the Hostinger SMTP Firebase Cloud Function.

## Included changes

1. Storefront navbar updated across the homepage and customer pages:
   - Products dropdown
   - All Products
   - New Arrivals
   - Reviews
   - Become Seller
2. Customer reviews rebuilt:
   - Requires a signed-in customer account.
   - Lists only products from that customer's Delivered orders.
   - Customer name/email and product/order details are filled automatically and displayed read-only.
   - Supports a 1–5 star rating, written feedback, and optional JPG/PNG/WEBP image upload (max 5 MB).
   - New reviews enter the existing admin moderation queue as `pending`.
   - Existing admin approval flow continues to award review points according to the Rewards settings.
3. Approved product reviews show on the matching product detail page with average rating, review count, stars, review text, and optional photo.
4. After customer sign-in, the storefront checks the customer's Delivered orders for unreviewed products and shows a bottom-right reminder for up to 30 seconds. It opens the preselected order/product in the Reviews page.
5. Rewards page icons changed to consistent Font Awesome icons.
6. Admin panel select controls received consistent styling.
7. Shipping-label QR caption and encoded QR content now include the Subeesha Quality Points upload instruction.
8. Firestore rules now verify that a review belongs to the signed-in customer and an exact product item in their own Delivered order. A composite index was added for product reviews.

## Deployment

Run these commands from the project root (the folder containing `firebase.json`):

```bash
firebase login
firebase use subeesha-74d2f
firebase deploy --only hosting,firestore:rules,firestore:indexes,functions
```

If the project is hosted outside Firebase Hosting, upload the changed storefront/admin files to that host and deploy Firebase separately:

```bash
firebase deploy --only firestore:rules,firestore:indexes,functions
```

The Functions deployment includes the existing Hostinger SMTP email function. Its secrets must already be configured in Firebase Secret Manager:

```bash
firebase functions:secrets:set HOSTINGER_SMTP_USER
firebase functions:secrets:set HOSTINGER_SMTP_PASS
```

Use `info@subeesha.com` as the username and the actual Hostinger mailbox password as the password. Do not put the SMTP password in frontend files.

## Notes

- The Firebase project must have billing enabled for Cloud Functions deployment.
- Cloudinary must be configured in `assets/js/firebase-config.js` for review photo uploads.
- Customers must have `role: "customer"` and a valid profile `name` and `email` in `users/{uid}`.
- Orders must use `userId` for the signed-in customer, `status: "Delivered"`, and contain product line items in `items` with an `id` field.
- Existing admin review moderation is retained. Approving a review publishes it and uses the existing review-points reward setting.
- Rewards page's current scanner is still the existing manual Purchase ID flow; this update changes the generated label QR content, not the scanner hardware/camera workflow.

## Validation performed

- JavaScript syntax checks on all modified JavaScript files.
- JSON parsing for Firebase configuration and Firestore indexes.
- Basic HTML parsing for the updated pages.
- Navbar link coverage check across the storefront pages.

The project has not been deployed to Firebase and live SMTP/email delivery has not been tested from this environment.
