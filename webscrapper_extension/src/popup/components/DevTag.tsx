import { IS_DEV, SERVER_URL } from "../../shared/env.js";

// Solo en builds de "npm run dev" / "npm run build:local"; en produccion
// IS_DEV es false en tiempo de compilacion y el componente no renderiza nada.
export function DevTag() {
  if (!IS_DEV) return null;
  return (
    <span
      title={`Build de desarrollo - API: ${SERVER_URL}`}
      className="cursor-default rounded bg-dev px-2 py-0.5 text-[11px] font-bold tracking-wide text-white"
    >
      DEV
    </span>
  );
}
