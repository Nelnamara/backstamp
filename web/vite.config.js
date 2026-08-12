import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Every API path proxies to the FastAPI server so the browser only ever
// talks to one origin — no CORS configuration needed on the backend.
const apiPaths = [
  "/items",
  "/franchises",
  "/item-types",
  "/rarities",
  "/tags",
  "/users",
  "/health",
  "/wishlist",
  "/watcher-sources",
  "/hallmark-references",
  "/set-manifests",
  "/photos",
  "/auth",
  "/contacts",
  "/exchange-sessions",
  "/convention-checkins",
  "/trade-records",
  "/vouches",
  "/reports",
  "/community-posts",
];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: Object.fromEntries(
      apiPaths.map((p) => [p, { target: "http://127.0.0.1:8000", changeOrigin: true }])
    ),
  },
});
