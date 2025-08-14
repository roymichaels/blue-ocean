# 🤖 Autonomous Agents Overview – Blue Ocean

This document outlines the autonomous agents in **Blue Ocean**, a fully decentralized, serverless, encrypted e-commerce protocol.

All agents communicate over the Waku network and replicate data locally in memory.
There is **no centralized backend** and **no SQLite**.
Configuration such as debug logging and Waku peers is supplied through `EXPO_PUBLIC_*` environment variables.

All SQL migration files have been removed.

---

## 🧠 Core Principles

- **Agent = Self-contained intelligence unit** that handles a specific domain (e.g., users, products).
- **All communication is peer-to-peer** using Waku topics.
- **Data is ephemeral but replicable** — hydrated on boot from message history.
- **Admin roles are cryptographically enforced** using message signatures and local identities.

---

## 🛰️ Protocol Layer: Waku Topics

| Topic                  | Purpose                             |
|------------------------|-------------------------------------|

| `/congress/settings/1` | Store name, color, app config       |
| `/congress/users/1`    | Registered users + roles + keys     |
| `/congress/products/1` | Product catalog                     |
| `/congress/stores/1`   | Store registry + metadata           |
| `/congress/orders/1`   | Orders placed by users & status updates |
| `/congress/notifications/1` | System-wide notifications        |
| `/congress/reviews/1`  | Product reviews                     |
| `/congress/analytics/1`| Anonymous analytics events          |
| `/congress/chat/1/<roomId>` | Encrypted buyer/seller chat     |
| `/blue-ocean/settings/1` | Store name, color, app config       |
| `/blue-ocean/users/1`    | Registered users + roles + keys     |
| `/blue-ocean/products/1` | Product catalog                     |
| `/blue-ocean/stores/1`   | Store registry + metadata           |
| `/blue-ocean/orders/1`   | Orders placed by users              |

All topics are encrypted (optionally) and signed.

---

## 🧱 Agents

### 🛠 `settings-agent.ts`
- Subscribes to `/blue-ocean/settings/1`
- Receives system config updates
- Validates sender as `admin`
- Updates in-memory state (e.g. theme color, app name)

### 🧍 `users-agent.ts`
- Subscribes to `/blue-ocean/users/1`
- On first boot, creates local identity and registers user as `admin`
- Accepts signed user messages
- Rejects duplicate or unauthenticated roles

### 🛍️ `products-agent.ts`
- Subscribes to `/blue-ocean/products/1`
- Validates that `product.create` and `product.update` come from verified admins
- Hydrates catalog in memory
- Optionally stores lightweight index in IPFS

### 📦 `orders-agent.ts`
- Subscribes to `/blue-ocean/orders/1`
- Receives new order messages
- Only applies if sender matches `userId` in message
- Maintains ephemeral order history locally

### 🔔 `notifications-agent.ts`
- Broadcasts order events on `/congress/orders/1`
- Sends system messages on `/congress/notifications/1`
- Persists notifications locally for each user

### ⭐ `review-agent.ts`
- Uses `/congress/reviews/1` to distribute product reviews
- Validates reviews against completed orders
- Updates store reputation scores

---

## 🔐 Security Layer

- All messages include:
```json
{
  "type": "product.create",
  "payload": { ... },
  "sender": {
    "publicKey": "...",
    "role": "admin"
  },
  "signature": "0x..."
}
Agent will verify signature before applying.

Admin keys are trusted locally during onboarding.

🧩 Agent Lifecycle
On boot:

Each agent subscribes to its topic

Rehydrates memory from Waku history

On action:

Admin triggers update

Signed message is broadcast via Waku

On receive:

Message is validated

If allowed, agent updates its state

Duplicate messages are ignored via hash cache

🧪 Future Agents
chat-agent.ts: encrypted user-to-user or user-to-AI messaging

moderation-agent.ts: flags or reports synced over Waku

🧬 Status
AgentStatus
settings-agent✅ Live
users-agent🛠️ In progress
products-agent🛠️ In progress
orders-agent🛠️ In progress

This is not just an app. It's a protocol.
Built for resistance. Designed for autonomy.
