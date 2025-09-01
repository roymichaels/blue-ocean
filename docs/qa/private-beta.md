# Private Beta QA Script

Use this checklist when testing private beta web builds. For each step, record the actual outcome and open an issue if it differs from the expected result.

## Web Build via IPFS Gateways

- [ ] Load the web app from `https://ipfs.io/ipfs/<CID>/`.
  - Expected: build loads and home screen renders.
  - Actual:
  - Issue:
- [ ] Load the web app from `https://dweb.link/ipfs/<CID>/`.
  - Expected: build loads and home screen renders.
  - Actual:
  - Issue:

## Wallet Setup

- [ ] Connect a NEAR wallet using the Wallet Selector UI.
  - Expected: wallet connects and account ID appears in the header.
  - Actual:
  - Issue:

## Offline or Slow Network

- [ ] Switch the device to offline mode and navigate between screens.
  - Expected: offline indicator shows and no crashes occur.
  - Actual:
  - Issue:
- [ ] Throttle the network to slow 3G and browse products.
  - Expected: pages load with graceful fallbacks and progress indicators.
  - Actual:
  - Issue:

## Long Chat History

- [ ] Send or receive over 100 messages in a chat and scroll through history.
  - Expected: older messages load smoothly and remain after restart.
  - Actual:
  - Issue:

## Large Catalog Browsing

- [ ] Browse a catalog with over 100 products and scroll to the end.
  - Expected: product list renders without missing items or broken images.
  - Actual:
  - Issue:

## Reporting

For any discrepancy between expected and actual outcomes, create an issue with reproduction steps and link it above.
