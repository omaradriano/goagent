import { useContext } from "react";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/animate-ui/components/radix/alert-dialog";
import {
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogPortal,
} from "@/components/animate-ui/primitives/radix/alert-dialog";
import { buttonVariants } from "@/components/animate-ui/components/buttons/button";
import { themedOutlineButton } from "@/lib/buttonStyles";
import { AlertContext } from "../Context/ContextConfig";

// Aviso global de la app (AlertContext): mensajes de exito/error. Usa el
// AlertDialog (Radix) de Animate UI como el resto de confirmaciones. Con
// onConfirm muestra Cancelar + Aceptar; sin el, es informativo y solo muestra
// Aceptar. Va encima del modal de detalle (z-index 1000) y debajo de
// ConfirmDialog (1200).
const Alert: React.FC = () => {
  const alert = useContext(AlertContext);
  if (!alert) return null;

  const { showAlert, setShowAlert, alertOptions } = alert;
  const isSuccess = alertOptions.type === "success";
  const onConfirm = alertOptions.onConfirm;

  return (
    <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
      <AlertDialogPortal>
        <AlertDialogOverlay className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-[2px]" />
        <AlertDialogContent className="fixed top-1/2 left-1/2 z-[1101] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-[var(--ga-surface-border)] bg-[var(--ga-surface)] p-6 text-[var(--ga-text)] shadow-lg sm:max-w-md">
          <div className="flex items-start gap-3">
            <span
              className={
                isSuccess
                  ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ga-pill-success-bg)] text-[var(--ga-pill-success)]"
                  : "flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ga-pill-danger-bg)] text-[var(--ga-pill-danger)]"
              }
            >
              {isSuccess ? <CheckCircleRoundedIcon /> : <ErrorRoundedIcon />}
            </span>
            <div className="flex flex-col gap-1.5 pt-1">
              <AlertDialogTitle>{alertOptions.title}</AlertDialogTitle>
              <AlertDialogDescription className="text-[var(--ga-muted)]">
                {alertOptions.message}
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter>
            {onConfirm && (
              <AlertDialogCancel className={themedOutlineButton}>
                Cancelar
              </AlertDialogCancel>
            )}
            <AlertDialogAction
              className={buttonVariants()}
              onClick={() => {
                // Radix cierra el dialogo; la accion corre despues.
                onConfirm?.();
              }}
            >
              Aceptar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  );
};

export default Alert;
