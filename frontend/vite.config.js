import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
  },
  define: {
    // Inject backend URL at build time via env variable
    __BACKEND_URL__: JSON.stringify(process.env.VITE_BACKEND_URL || ""),
  },
});
