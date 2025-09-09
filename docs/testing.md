# Testing Matrix

The following matrix outlines mandatory test scenarios that must be exercised before shipping changes.

| Area | Scenarios | Tools |
| --- | --- | --- |
| Contracts | Unit tests for smart contract bindings, failure paths, and serialization | Jest with near-mock contracts |
| Services | Happy path logic, network failures, caching behavior, auth guards | Jest with service mocks |
| UI | Component rendering, navigation flows, theme switching, accessibility checks | React Testing Library |
| Integration | Waku messaging across peers, NEAR RPC fallbacks, end-to-end checkout | Playwright, Jest |

