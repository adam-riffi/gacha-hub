/**
 * Content-Security-Policy (ENGINEERING.md §12). Scripts are the app's own;
 * images also come from the community art CDNs, Discord avatars and Vercel
 * Blob uploads; inline styles are allowed because React renders `style` props.
 * Fonts are self-hosted (VISUAL-DESIGN.md §12).
 * vercel.json sends the same headers for static files (a test keeps them equal).
 */
const CSP: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": ["'self'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "font-src": ["'self'"],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://enka.network",
    "https://sr.yatta.moe",
    "https://cdn.discordapp.com",
    "https://*.public.blob.vercel-storage.com",
    // Our own copy of the game art, in a public R2 bucket (ADR 0006).
    "https://*.r2.dev",
  ],
  "connect-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
};

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": Object.entries(CSP)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; "),
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
