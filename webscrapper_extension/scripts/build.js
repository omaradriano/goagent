import { build } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { watch } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const isWatch = process.argv.includes("--watch");

const popupConfig = {
  root,
  configFile: false,
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: resolve(root, "src/popup/index.js"),
      formats: ["es"],
      fileName: () => "popup/popup.js",
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

async function runBuild() {
  await build(popupConfig);
  await build(backgroundConfig);
  await build(contentConfig);
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
