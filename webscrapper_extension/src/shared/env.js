export const SERVER_URL = import.meta.env.VITE_SERVER_URL;
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL;
// true en builds de "npm run dev" / "npm run build:local" (.env.development).
export const IS_DEV = import.meta.env.MODE === "development";
