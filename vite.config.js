import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" keeps asset paths relative, so the build works from the GitHub Pages
// project folder (/queusc-mockup/) without hard-coding the repository name.
export default defineConfig({
  plugins: [react()],
  base: "./"
});
