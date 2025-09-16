# MVP App Tree (Screens → Components → Buttons)

Auth
- Connect Wallet → [PrimaryCTA: "Connect"] → onSuccess: request `checkout` scope
- Set PIN (6-digit) → Confirm → Store bcrypt hash (secure)

Home
- TopBar (StoreName, CartIcon, SearchIcon)
- ProductGrid (cards: image/name/price/Add-to-Cart)
- Drawer: Ops (sync, key health) [flag: opsDrawer]

Store Admin (admin only)
- StoreProfile (avatar, banner, name, tagline) [Save]
- Products (list) [Add Product] → ProductEditor (name, price, stock, media) [Save]
- Orders (list) [Mark Fulfilled]
- Admins (pending approvals) [Approve]

Cart & Checkout
- CartList (qty +/-) [Checkout]
- CheckoutPinPrompt → require PIN
- Confirm & Pay (NEAR) [Pay] → emits `order.status: created`

Settings
- KYC Policy [toggle], Policy text [save]
- Payments: NEAR fee config; MoonPay (flagged; tenant API key field disabled)
