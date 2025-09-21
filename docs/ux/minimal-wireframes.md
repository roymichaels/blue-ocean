# Minimal Wireframes

These sketches communicate the post-slimming navigation and hierarchy. Each block represents a screen; dashed lines show gestures
or quick actions.

```
┌──────────────────────────┐
│ Home (default tab)       │
│ ┌──────────────┐         │
│ │ Hero store   │ tap →   │
│ └──────────────┘         │
│ Quick filters  → chips   │
│ Trending row   → scroll  │
│ Nearby stores  → cards   │
└──────────────────────────┘
        ⇩ tab
┌──────────────────────────┐
│ Search                   │
│ [ 🔍 query____________ ] │
│ Quick filters chips      │
│ ────────────────         │
│ Stores (list)            │
│ Products (grid)          │
└──────────────────────────┘
        ⇩ tab
┌──────────────────────────┐
│ Messages                 │
│ Thread card → detail TBD │
│ (unread badge on card)   │
└──────────────────────────┘
        ⇩ tab
┌──────────────────────────┐
│ Orders                   │
│ Order card → summary     │
│ (status badge + ETA)     │
└──────────────────────────┘
        ⇩ tab
┌──────────────────────────┐
│ Profile                  │
│ Mode toggle (mock/live)  │
│ Build info card          │
└──────────────────────────┘
```

Interactions:

- Tab bar is always visible; haptic feedback on every press.
- Home hero card responds to taps with a light selection effect (future deep link placeholder).
- Search chips autofill the query box and fire a debounced search.
- Messages and Orders lists support pull-to-refresh.
- Profile toggle writes to AsyncStorage and updates the commerce client on the fly.
