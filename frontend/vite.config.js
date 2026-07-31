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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large vendor libraries into separate chunks
          "react-vendor":  ["react", "react-dom", "react-router-dom"],
          "chart-vendor":  ["chart.js", "react-chartjs-2"],
          "icons-vendor":  ["lucide-react"],
          "axios-vendor":  ["axios"],
        },
      },
    },
  },
});
