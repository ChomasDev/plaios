import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Assets live under /-/store/ so they never collide with npm package routes on the same port.
export default defineConfig({
  base: "/-/store/",
  resolve: {
    alias: {
      "@api": fileURLToPath(new URL("../src/trpc.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), tailwindcss(), viteReact()],
  build: { outDir: "../dist/web", emptyOutDir: true },
  server: { proxy: { "/-/store/trpc": "http://127.0.0.1:4873", "^/@": "http://127.0.0.1:4873" } },
})
