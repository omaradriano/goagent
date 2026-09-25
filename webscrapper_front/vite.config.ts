import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          [
            "babel-plugin-styled-components",
            {
              displayName: true, // Esto es lo que activa el trackeo
            },
          ],
        ],
      },
    }),
    // Tailwind solo para componentes de Animate UI/shadcn (ver
    // src/styles/tailwind.css: sin preflight para no alterar styled-components).
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
