import { useState } from "react";
import type { PolizaGetItem } from "../Types/types";

function useModalState(isModalOpen = false) {
  const [isOpen, setIsOpen] = useState<boolean>(isModalOpen);
  const [polizaData, setPolizaData] = useState<PolizaGetItem>({} as PolizaGetItem);

  return { isOpen, setIsOpen, polizaData, setPolizaData };
}

export default useModalState;
