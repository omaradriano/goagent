import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/animate-ui/components/radix/alert-dialog";
import {
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogPortal,
} from "@/components/animate-ui/primitives/radix/alert-dialog";
import { buttonVariants } from "@/components/animate-ui/components/buttons/button";
import { cn } from "@/lib/utils";
import { themedOutlineButton } from "@/lib/buttonStyles";

export interface ConfirmOptions {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  // "danger" para acciones destructivas (boton rojo).
  tone?: "primary" | "danger";
  onConfirm: () => void | Promise<void>;
}

interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
}

// Confirmacion con el AlertDialog (Radix) de Animate UI. Se arma con las
// primitivas para controlar la capa: el modal de detalle esta en z-index 1000
// y el aviso global en 1100, asi que el dialogo va encima de ambos. Los
// colores salen de las variables --ga-* del GlobalStyle (claro/oscuro).
export function ConfirmDialog({
  open,
  busy,
  onOpenChange,
  title,
  description,
  confirmLabel = "Aceptar",
  cancelLabel = "Cancelar",
  tone = "primary",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPortal>
        <AlertDialogOverlay className="fixed inset-0 z-[1200] bg-black/50 backdrop-blur-[2px]" />
        <AlertDialogContent
          className="fixed top-1/2 left-1/2 z-[1201] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-[var(--ga-surface-border)] bg-[var(--ga-surface)] p-6 text-[var(--ga-text)] shadow-lg sm:max-w-md"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--ga-muted)]">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={busy}
              className={themedOutlineButton}
            >
              {cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className={cn(
                buttonVariants({
                  variant: tone === "danger" ? "destructive" : "default",
                }),
              )}
              onClick={(e) => {
                // Se cierra hasta que termine la accion (async).
                e.preventDefault();
                void onConfirm();
              }}
            >
              {busy ? "Procesando..." : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  );
}
