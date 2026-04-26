import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-mantine": ["@mantine/core", "@mantine/dates", "@mantine/hooks"],
          "vendor-editor": ["@tiptap/react", "@tiptap/starter-kit", "@tiptap/extension-placeholder", "@tiptap/extension-underline"],
          "vendor-pdf": ["jspdf"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Allow app to run on any available port
  server: {
    host: "localhost",
    strictPort: false,
  },
  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ["**/*.svg", "**/*.csv"],
});
