import { useState } from "react";

export interface AlertOptions {
  title: string;
  message: string;
  onConfirm?: () => void;
  type: 'error' | 'success'
}

function useModalAlert(isAlertOpen = false) {
  const [showAlert, setShowAlert] = useState<boolean>(isAlertOpen);
  const [alertOptions, setAlertOptions] = useState<AlertOptions>({
    title: "Titulo de prueba",
    message: "Mensaje por defecto",
    onConfirm: () => {
      console.log("Mensaje por defecto");
    },
    type: 'error'
  });

  return { showAlert, setShowAlert, alertOptions, setAlertOptions };
}

export default useModalAlert;
