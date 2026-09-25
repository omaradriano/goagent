import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";

type OnAccept = () => void | Promise<void>;

interface DialogState {
  title: string;
  message: string;
  onAccept: OnAccept | null;
}

interface ConfirmDialogApi {
  // Misma firma que el Alert anterior: sin onAccept es un aviso (solo
  // "Cancelar"); con onAccept agrega "Aceptar".
  show: (title: string, message: string, onAccept?: OnAccept) => void;
}

const ConfirmDialogContext = createContext<ConfirmDialogApi | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const show = useCallback(
    (title: string, message: string, onAccept?: OnAccept) => {
      setDialog({ title, message, onAccept: onAccept ?? null });
    },
    [],
  );

  const close = () => setDialog(null);

  // Se cierra antes de ejecutar la accion: la accion puede abrir otro
  // dialogo (resultado o error) y no debe quedar tapada por este.
  const accept = async () => {
    const action = dialog?.onAccept;
    close();
    if (!action) return;
    try {
      await action();
    } catch (error) {
      show(
        "Error",
        `Existe un error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  return (
    <ConfirmDialogContext.Provider value={{ show }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="flex w-full max-w-[400px] flex-col overflow-hidden rounded-lg bg-card"
          >
            <div className="flex h-[50px] items-center justify-between border-b px-2.5">
              <h3 id="confirm-dialog-title" className="text-[1.2rem] font-bold">
                {dialog.title}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Cerrar"
                onClick={close}
              >
                <i className="fa-solid fa-xmark" />
              </Button>
            </div>
            <div className="flex min-h-20 items-center justify-center p-2.5 text-center">
              <p>{dialog.message}</p>
            </div>
            <div className="flex h-[50px] items-center justify-end gap-1.5 border-t px-2.5">
              <Button type="button" variant="outline" size="sm" onClick={close}>
                Cancelar
              </Button>
              {dialog.onAccept && (
                <Button type="button" size="sm" onClick={accept}>
                  Aceptar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog(): ConfirmDialogApi {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error("useConfirmDialog debe usarse dentro de ConfirmDialogProvider");
  }
  return ctx;
}
