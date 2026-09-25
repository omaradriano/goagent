import { useState, type FormEvent } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { FRONTEND_URL } from "../../shared/env.js";
import {
  openTab,
  sendToBackground,
  type SessionData,
} from "@/popup/lib/chrome";

interface AuthViewProps {
  // Se llama con la sesion verificada despues de un login exitoso.
  onAuthenticated: (session: SessionData) => void;
}

export function AuthView({ onAuthenticated }: AuthViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invalidCredentials, setInvalidCredentials] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const loginRes = await sendToBackground({
        action: "exec-authentication-by-credentials",
        credentials: { email, password },
      });

      if (!loginRes.success) {
        setInvalidCredentials(true);
        return;
      }

      const authRes = await sendToBackground<SessionData>({
        action: "verify-session",
      });
      if (authRes.success && authRes.data) {
        onAuthenticated(authRes.data);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    sendToBackground({ action: "exec-authentication-by-google" });
  };

  return (
    <section className="w-full">
      <form onSubmit={handleLogin}>
        <div className="my-2.5 flex flex-col gap-1.5">
          <label className="block">
            <span className="mb-0.5 block text-sm text-muted-foreground">
              Correo
            </span>
            <input
              type="text"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-7 w-full rounded bg-black/10 px-1 text-base outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-0.5 block text-sm text-muted-foreground">
              Contraseña
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-7 w-full rounded bg-black/10 px-1 text-base outline-none"
            />
          </label>
        </div>

        {invalidCredentials && (
          <p className="mx-1 mt-1 mb-2.5 rounded-md border border-[#ea868f] bg-red-500/10 px-2.5 py-2 text-[0.8rem] text-destructive">
            Credenciales inválidas
          </p>
        )}

        <Button
          type="submit"
          disabled={submitting}
          hoverScale={1.02}
          className="mb-1.5 w-full"
        >
          Iniciar sesión
        </Button>
      </form>

      <p className="my-2.5 flex w-full items-center justify-center gap-1.5 text-[0.95rem] text-muted-foreground">
        Aún no tienes cuenta?
        <Button
          type="button"
          variant="link"
          size="sm"
          hoverScale={1}
          onClick={() => openTab(`${FRONTEND_URL}/auth/register`)}
          className="h-auto p-0 text-[0.95rem]"
        >
          Registrate
        </Button>
      </p>
      <p className="my-2.5 flex w-full items-center justify-center text-[0.95rem]">
        <Button
          type="button"
          variant="link"
          size="sm"
          hoverScale={1}
          onClick={() =>
            openTab(`${FRONTEND_URL}/auth/resetpasswordinitflow`)
          }
          className="h-auto p-0 text-[0.95rem]"
        >
          Olvidé mi contraseña
        </Button>
      </p>

      <div className="my-2.5 flex items-center gap-2.5">
        <span className="h-px flex-1 bg-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">o inicia sesión con</p>
        <span className="h-px flex-1 bg-muted-foreground/50" />
      </div>
      <div className="flex h-10 items-center justify-center">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Iniciar sesión con Google"
          onClick={handleGoogleLogin}
          className="rounded-full"
        >
          <i className="fa-brands fa-google" />
        </Button>
      </div>
    </section>
  );
}
