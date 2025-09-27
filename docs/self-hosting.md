# Self-hosting the developer portal

Blue Ocean docs compile to static files so you can host them anywhere—S3 buckets, object storage, GitHub Pages, or a private
registry. The build is deterministic and requires only Node.js.

## Build locally

```sh
npm install
npm run docs:build
```

The static site is emitted to `docs/.vitepress/dist`. Serve it locally to confirm routing and assets:

```sh
npx serve docs/.vitepress/dist --single --listen 4173
```

Navigate to `http://localhost:4173` and load the [API playground](./api-playground.md) to verify hydration.

## Deploy with Docker

Create a minimal container image by copying the prebuilt assets into a tiny web server such as `caddy` or `nginx`:

```Dockerfile
FROM caddy:2.8-alpine
COPY docs/.vitepress/dist /srv
CMD ["caddy", "file-server", "--root", "/srv", "--listen", ":8080"]
```

Build and run:

```sh
docker build -t blue-ocean-docs .
docker run -p 8080:8080 blue-ocean-docs
```

## Hosting under a sub-path

When deploying behind a reverse proxy (for example, `https://portal.example.com/docs`), update the VitePress base path in
`.vitepress/config.ts`:

```ts
export default defineConfig({
  base: '/docs/',
  // …
});
```

Rebuild with `npm run docs:build` so that generated asset URLs respect the new base. Configure your proxy to rewrite `/docs` to the
static directory.

## Continuous publishing

Automate builds with your CI provider:

1. Install dependencies with `npm ci`.
2. Run `npm run docs:build` to produce the site.
3. Upload `docs/.vitepress/dist` as a build artifact, container layer, or direct deployable.

The link checker workflow defined in `.github/workflows/ci.yml` ensures internal and external references remain valid between
releases.
