/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_SERVER_URL: string;
  // Agrega aquí todas tus variables para que TypeScript las reconozca
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
