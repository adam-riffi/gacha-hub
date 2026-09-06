import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: proxy API + uploads to the Fastify server so the browser stays
// same-origin (cookies work, no CORS). Prod: the server serves the built app.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@gacha/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
      "/uploads": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
