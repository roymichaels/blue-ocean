// Web-only HTML template for Expo Router
// Injects a permissive CSP for development so connections to NEAR RPC
// and Waku websockets are allowed. Tighten this for production as needed.
import { ScrollViewStyleReset } from "expo-router/html";

export default function Document({ children }: { children: React.ReactNode }) {
  const csp =
    "default-src 'self' blob: data: ws: wss: https: http:; connect-src *; img-src * blob: data:; media-src * blob: data:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https: http:";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="Content-Security-Policy" content={csp} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        {/* Ensure the root stretches to viewport height so RNW flex layouts render */}
        <style
          dangerouslySetInnerHTML={{
            __html: `html, body, #root { height: 100%; margin: 0; padding: 0; }`,
          }}
        />
        <ScrollViewStyleReset />
        <title>Blue Ocean Marketplace</title>
        {/* Strong CSS to guarantee visible layout on web */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body { height: 100% !important; margin: 0 !important; padding: 0 !important; }
              #root, #app-root { height: 100% !important; min-height: 100vh !important; min-width: 100vw !important; }
              body { background: #0b0b0b; color: #fff; }
            `,
          }}
        />
      </head>
      <body>
        {/* Temporary badge to prove the Document is rendering */}
        <div
          style={{
            position: "fixed",
            top: 8,
            left: 8,
            zIndex: 9999,
            background: "#222",
            color: "#fff",
            padding: "4px 8px",
            borderRadius: 6,
            fontSize: 12,
            fontFamily: "monospace",
          }}
        >
          DOC OK
        </div>
        {children}
      </body>
    </html>
  );
}
