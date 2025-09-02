# Navigation

The diagram below shows key user flows and links to the source files for each screen or component.

```mermaid
flowchart LR
    Home[Home] --> Store[Storefront]
    Store --> Product[Product]
    Product --> Cart[Cart]
    Cart --> Checkout[Checkout]

    Home --> BecomeSeller[Become Seller]
    BecomeSeller --> MintStore[Mint Store]
    MintStore --> Home

    click Home "../app/(tabs)/index.tsx" "Home screen"
    click Store "../app/store/[storeId]/index.tsx" "Storefront"
    click Product "../app/product/[id].tsx" "Product page"
    click Cart "../app/(tabs)/cart.tsx" "Cart screen"
    click Checkout "../src/features/cart/components/CartModal.tsx" "Checkout steps"
    click BecomeSeller "../src/features/home/components/CTABecomeSeller.tsx" "Become Seller CTA"
    click MintStore "../src/features/stores/components/StoreCreation.tsx" "Mint Store component"
```

## Flows

- Home → Store → Product → Cart → Checkout
- Home → Become Seller → Mint Store → Home

