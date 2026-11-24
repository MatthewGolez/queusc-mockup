import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, API calls go to the Express server (npm run dev:server) on port 3000.
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { proxy: { "/api": "http://localhost:3000" } }
});
