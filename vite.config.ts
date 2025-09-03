import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    allowedHosts: ["gai-beach-ai.replit.app"],
    hmr: {
      protocol: "wss", // use secure WebSockets if deploying via HTTPS
      host: "15f8e412-8361-42c4-8b18-f60d812717a7-00-1435l66cljp23.pike.replit.dev",
      port: 443,
    },
  },
});
