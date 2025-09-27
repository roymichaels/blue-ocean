# API Playground

Experiment with agent-facing HTTP helpers before wiring them into production services. The playground sends real requests to your
environment (or returns deterministic mock data when you are offline) so you can iterate on payload shape and authentication
workflows.

<ClientOnly>
  <ApiPlayground />
</ClientOnly>

## Example: create a product draft

```ts
async function createDraft() {
  const res = await fetch('http://localhost:8787/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SERVICE_TOKEN}`
    },
    body: JSON.stringify({
      id: 'hex-blade-9',
      name: 'Hex Blade 9',
      price: '49.00',
      currency: 'USD',
      availability: 'in-stock'
    })
  });

  if (!res.ok) {
    throw new Error(`Failed to create draft: ${res.status}`);
  }

  return res.json();
}
```

- Toggle **Use mock response** when you want to preview payloads without a running API.
- Set **Base URL** to any accessible environment (local dev tunnels, staging, or production).
- Use the resolved URL hint to confirm path normalization before executing the call.

## Troubleshooting tips

- Responses are prettified when they contain valid JSON, but the raw payload is shown for other content types.
- CORS errors are reported as generic failures. Run the docs on the same origin or configure `Access-Control-Allow-Origin` for
  the docs hostname during local testing.
- When running behind a reverse proxy with a sub-path (e.g. `/docs`), update the `base` option in `.vitepress/config.ts` and
  rebuild with `npm run docs:build` so relative asset URLs resolve correctly.
