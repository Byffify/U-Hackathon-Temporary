import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    proxy: {
      "/api/v1": {
        target:
          process.env.API_PROXY_TARGET ||
          loadEnv(mode, process.cwd(), "API_PROXY_TARGET").API_PROXY_TARGET ||
          "http://127.0.0.1:8080",
        // Keep browser requests on the frontend origin so challenge and session
        // cookies are sent back when the wallet signature is verified.
        changeOrigin: true,
      },
    },
  },
  build: { outDir: "dist", emptyOutDir: true },
}));
