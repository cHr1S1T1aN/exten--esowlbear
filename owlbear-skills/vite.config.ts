import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    cors: true,
    allowedHosts: [".ngrok-free.dev"],
  },

  preview: {
    port: 4173,
  },
});
