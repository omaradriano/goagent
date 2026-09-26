import { useCallback, useState } from "react";
import {
  ConfirmDialog,
  type ConfirmOptions,
} from "../components/confirmDialog";

// const { confirm, dialog } = useConfirmDialog();
// confirm({ title, description, onConfirm }) y renderizar {dialog}.
function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Las opciones se conservan al cerrar para que la animacion de salida no
  // muestre el dialogo vacio.
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    setOpen(true);
  }, []);

  const dialog = options ? (
    <ConfirmDialog
      {...options}
      open={open}
      busy={busy}
      onOpenChange={(next) => {
        if (!busy) setOpen(next);
      }}
      onConfirm={async () => {
        setBusy(true);
        try {
          await options.onConfirm();
        } finally {
          setBusy(false);
          setOpen(false);
        }
      }}
    />
  ) : null;

  return { confirm, dialog };
}

export default useConfirmDialog;
