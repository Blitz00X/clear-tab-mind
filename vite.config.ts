import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        // Full-page dashboard
        main: path.resolve(__dirname, "index.html"),
        // Chrome Side Panel
        sidepanel: path.resolve(__dirname, "sidepanel.html"),
        // Existing popup
        popup: path.resolve(__dirname, "popup.html"),
      },
      output: {
        // Prevent vendor chunks from sharing across entries to avoid CORB issues
        manualChunks: undefined,
      },
    },
    outDir: "dist",
    emptyOutDir: true,
  },
}));
