import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/postcss";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/main/index.ts"),
          "mcp/computer-use/server": resolve(
            __dirname,
            "src/main/mcp/computer-use/server.ts"
          ),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "src/preload/index.ts"),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/renderer/src"),
        "@shared": resolve(__dirname, "src/shared"),
      },
    },
    css: {
      postcss: { plugins: [tailwindcss()] },
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "src/renderer/index.html"),
      },
    },
  },
});
