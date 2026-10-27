import { defineConfig } from "vite"

export default defineConfig({
  base: "./",
  server: {
    port: 5173,
    proxy: {
      "/arcade/wings/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    target: "es2022",
    rollupOptions: { input: { main: "index.html", check: "check-ui.html" } },
  },
})
