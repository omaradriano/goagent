/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_SERVER_URL: string;
  // IDs de la extension de Chrome (separados por coma) para el login desde
  // la web con ?from=extension. Opcional.
  readonly VITE_EXTENSION_IDS?: string;
  // Agrega aquí todas tus variables para que TypeScript las reconozca
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
