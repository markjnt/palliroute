import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig(({ mode }) => {
  // Shared with PWA: frontend/.env (+ optional repo-root .env)
  const frontendDir = path.resolve(__dirname, "..");
  const repoRoot = path.resolve(__dirname, "../..");
  const env = {
    ...loadEnv(mode, repoRoot, ""),
    ...loadEnv(mode, frontendDir, ""),
  };
  const internalApiKey = env.INTERNAL_API_KEY || process.env.INTERNAL_API_KEY;

  return {
    envDir: frontendDir,
    publicDir: "../public",
    plugins: [
      react({
        jsxImportSource: "@emotion/react",
        babel: {
          plugins: ["@emotion/babel-plugin", "babel-plugin-react-compiler"],
        },
      }),
      tsconfigPaths(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react-dom"],
      exclude: [
        "@palliroute/shared",
        "@palliroute/models",
        "@palliroute/api",
        "@palliroute/queries",
        "@palliroute/stores",
        "@palliroute/ui",
      ],
    },
    server: {
      fs: {
        allow: [".."],
      },
      port: 3000,
      open: true,
      proxy: {
        "/api": {
          target: "http://localhost:9000",
          changeOrigin: true,
          configure: (proxy) => {
            if (!internalApiKey) return;
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("X-Internal-Api-Key", internalApiKey);
            });
          },
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
