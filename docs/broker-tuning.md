# Broker Tuning Guide

Guidelines for configuring message brokers to avoid overload.

## Back-Pressure Thresholds

Set a backlog limit to protect the node. When the queue exceeds this threshold the broker returns `E_BACKLOG` and publishers should pause before retrying.

- **Recommended**: start throttling when pending messages exceed **1,000** per topic.
- Expose `retryAfter` in errors so clients know when to resume.

## Queue Sizing

Right-size queues to balance memory use and throughput.

- Allocate at least **10×** the expected peak burst to prevent drops.
- Monitor high-water marks and adjust based on observed traffic.

Keeping these limits documented helps operators tune for predictable latency without exhausting resources.
