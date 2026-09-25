import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { watch, readFileSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const isWatch = process.argv.includes("--watch");
const isLocal = process.argv.includes("--local");
const mode = isLocal ? "development" : "production";

console.log(`Building in "${mode}" mode (.env.${mode})`);

// Popup en React + Tailwind. Alias "@/" -> src/: los componentes de Animate
// UI/shadcn se instalan en src/components (el registry fija esa ruta y se
// importan entre si como "@/components/animate-ui/...") y el codigo propio
// del popup se importa como "@/popup/...". Se compila en modo lib para
// conservar las rutas fijas de public/popup/popup.html (popup/popup.js y
// popup/popup.css).
const popupConfig = {
  root,
  mode,
  configFile: false,
  publicDir: "public",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": resolve(root, "src") },
  },
  // En modo lib Vite no reemplaza process.env.NODE_ENV, y React lo usa para
  // elegir su build de desarrollo/produccion.
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: !isLocal,
    lib: {
      entry: resolve(root, "src/popup/main.tsx"),
      formats: ["es"],
      fileName: () => "popup/popup.js",
      cssFileName: "popup",
    },
    rollupOptions: {
      output: {
        assetFileNames: "popup/[name].[ext]",
      },
    },
  },
};

const backgroundConfig = {
  root,
  mode,
  configFile: false,
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: resolve(root, "src/background/index.js"),
      formats: ["es"],
      fileName: () => "background.js",
    },
  },
};

const contentConfig = {
  root,
  mode,
  configFile: false,
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: resolve(root, "src/content/index.js"),
      formats: ["iife"],
      name: "ContentScript",
      fileName: () => "content.js",
    },
  },
};

// En builds locales se marca el manifest generado en dist (no el de public)
// para distinguir la extension sin empaquetar de la publicada en
// chrome://extensions y en el tooltip del icono.
function markManifestAsDev() {
  const manifestPath = resolve(root, "dist/manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.name = `${manifest.name} (DEV)`;
  if (manifest.action?.default_title) {
    manifest.action.default_title = `${manifest.action.default_title} (DEV)`;
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

async function runBuild() {
  await build(popupConfig);
  await build(backgroundConfig);
  await build(contentConfig);
  if (isLocal) markManifestAsDev();
  console.log("\nBuild completed successfully!");
}

async function runWatch() {
  await runBuild();
  console.log("\nWatching src/ and public/ for changes...\n");

  let debounceTimer = null;

  const rebuild = (filename) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      console.log(`\nChange detected: ${filename}`);
      try {
        await runBuild();
      } catch (err) {
        console.error("Build failed:", err.message);
      }
    }, 200);
  };

  watch(resolve(root, "src"), { recursive: true }, (_, filename) => {
    rebuild(`src/${filename}`);
  });

  watch(resolve(root, "public"), { recursive: true }, (_, filename) => {
    rebuild(`public/${filename}`);
  });
}

if (isWatch) {
  runWatch().catch((err) => {
    console.error("Watch failed:", err);
    process.exit(1);
  });
} else {
  runBuild().catch((err) => {
    console.error("Build failed:", err);
    process.exit(1);
  });
}
