import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: "0.0.0.0",
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (
            id.includes("node_modules/react/")
            || id.includes("node_modules/react-dom/")
            || id.includes("node_modules/react-router/")
            || id.includes("node_modules/react-router-dom/")
          ) {
            return "vendor-react";
          }

          if (id.includes("node_modules/@mui/") || id.includes("node_modules/@emotion/")) {
            return "vendor-ui";
          }

          if (id.includes("node_modules/@tanstack/react-query")) {
            return "vendor-query";
          }

          if (id.includes("node_modules/react-hook-form") || id.includes("node_modules/zod")) {
            return "vendor-forms";
          }

          if (id.includes("node_modules/date-fns")) {
            return "vendor-utils";
          }

          return undefined;
        },
      },
    },
  },
});