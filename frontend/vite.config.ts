import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Where the dev server proxies /api and /socket.io. Set VITE_DEV_API_TARGET in
  // .env.development.local when the backend isn't on port 5000.
  const apiTarget = loadEnv(mode, __dirname, "").VITE_DEV_API_TARGET || "http://localhost:5000";

  return {
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@shared": resolve(__dirname, "../shared"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
  server: {
    port: 5173,
    // The backend sends shoppers back here after eSewa (FRONTEND_URL). Moving to
    // another port when 5173 is busy would land them on whatever else runs there,
    // so fail loudly instead.
    strictPort: true,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
      "/socket.io": {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  };
});
