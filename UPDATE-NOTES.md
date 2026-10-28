# Subeesha updates — 28 October 2026

- Added shared Poppins typography and consistent compact (up to 4px) UI corners.
- Added responsive mobile search toggle, recent searches, Firebase product-name suggestions, and shop/product navigation.
- Added an animated logo + three-dot startup loader on the homepage and a checkout shimmer while catalog/shipping/payment data loads.
- Added related products to the product detail page and a responsive compact product gallery/card layout.
- Changed reseller shared product URLs to open the product detail page with the reseller referral code.
- Added a compact A5-print invoice with editable store/customer fields. Edits can be saved locally in the same browser and then printed; they do not overwrite the original Firestore order.
- Fixed the order-number counter Firestore rule so active signed-in users can read the single counter document required by the checkout transaction; counter listing remains admin-only.

## Required Firebase action for order placement

Publish the updated `firestore.rules` to the Firebase project. From the Firebase Console, open **Firestore Database → Rules**, replace the rules with this file's contents, and click **Publish**. Alternatively, use `firebase deploy --only firestore:rules` from a project directory already configured for the correct Firebase project. This code archive cannot publish rules to the live Firebase project by itself.
