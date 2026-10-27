import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig(() => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: false,
    allowedHosts: true,
  },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    modules: {
      localsConvention: "camelCase" as const,
    },
  },
}));
