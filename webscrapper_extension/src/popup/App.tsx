import { useEffect, useState } from "react";
import { DevTag } from "@/popup/components/DevTag";
import { Loader } from "@/popup/components/Loader";
import { AuthView } from "@/popup/views/AuthView";
import { ManagementView } from "@/popup/views/ManagementView";
import {
  getActiveTab,
  rememberEmail,
  sendToBackground,
  type SessionData,
} from "@/popup/lib/chrome";

type View =
  | { name: "loading" }
  | { name: "signin" }
  | { name: "management"; session: SessionData };

interface ActiveTab {
  id: number;
  // Ultimo segmento de la URL (ej. "PolizasAgente.aspx"), igual que antes.
  page: string;
}

export function App() {
  const [view, setView] = useState<View>({ name: "loading" });
  const [activeTab, setActiveTab] = useState<ActiveTab | null>(null);

  useEffect(() => {
    (async () => {
      const tab = await getActiveTab();
      if (tab.id !== undefined) {
        setActiveTab({ id: tab.id, page: tab.url?.split("/").pop() ?? "" });
      }

      const authRes = await sendToBackground<SessionData>({
        action: "verify-session",
      });
      setView(
        authRes.success && authRes.data
          ? { name: "management", session: authRes.data }
          : { name: "signin" },
      );
    })();
  }, []);

  const goToSignin = () => setView({ name: "signin" });

  // Cualquier sesion verificada (correo/contrasena o Google) actualiza el
  // correo recordado para el proximo login.
  useEffect(() => {
    if (view.name === "management") void rememberEmail(view.session.email);
  }, [view]);

  return (
    <div className="relative w-full bg-background p-2.5">
      <header className="flex items-center justify-between px-2.5 py-1.5">
        <img
          src="../icons/newyorklifepng.png"
          alt="Logo de seguros monterrey"
          className="h-[50px]"
        />
        <DevTag />
      </header>

      <main className="h-full bg-surface p-1.5">
        {view.name === "loading" && <Loader />}
        {view.name === "signin" && (
          <AuthView
            onAuthenticated={(session) =>
              setView({ name: "management", session })
            }
          />
        )}
        {view.name === "management" && activeTab && (
          <ManagementView
            session={view.session}
            tabId={activeTab.id}
            currentPage={activeTab.page}
            onLoggedOut={goToSignin}
            onSessionLost={goToSignin}
          />
        )}
      </main>
    </div>
  );
}
