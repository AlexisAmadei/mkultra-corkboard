import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The PocketBase SDK (base URL "/") calls `/api/...`. Proxy those to the
// PocketBase server so the frontend needs no CORS config or absolute URLs.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": { target: "http://127.0.0.1:8090", changeOrigin: true, ws: true },
      "/_": { target: "http://127.0.0.1:8090", changeOrigin: true },
    },
  },
});
