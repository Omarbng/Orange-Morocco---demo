import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Landing app is self-contained — Eva compositions live in src/eva/
// rather than being imported from a sibling project, so deployment
// environments like Vercel can resolve all dependencies from this
// project's own node_modules.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
