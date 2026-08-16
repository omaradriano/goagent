import React, { useEffect, useState } from "react";
import type { PolizaGetItem } from "../Types/types";
import styled from "styled-components";
import { PolizasNoItems } from "./NoFunctional";
import Icon from "./icon";
import PolizaItem from "./polizaItem";
import { headerTheme, textTheme__css } from "../styles/CssComponents";
import Modal from "./modal";
import useModalState from "../customHooks/useModalState";

export interface PolizasContainerProps {
  data: PolizaGetItem[];
  notificationsNotifier: {
    stateAction: React.Dispatch<React.SetStateAction<PolizaGetItem[]>>;
    stateValue: PolizaGetItem[];
  };
}

const PolizasContainer: React.FC<PolizasContainerProps> = ({
  data,
  notificationsNotifier,
}) => {
  const [isMobile, setIsMobile] = useState(
    window.matchMedia("(max-width: 768px)").matches,
  );

  const { isOpen, setIsOpen, polizaData, setPolizaData } = useModalState(false);
  // const { showAlert, setShowAlert, alertData, setAlertData } = useModalAlert(false);

  useEffect(() => {
    const watcher = window.matchMedia("(max-width: 768px)");
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    watcher.addEventListener("change", listener);
    return () => watcher.removeEventListener("change", listener);
  }, []);

  return (
    <PolizasContainerCustom>
      <Modal
        title="Detalle poliza"
        setModalOpen={setIsOpen}
        modalOpen={isOpen}
        polizaData={polizaData}
      />
      {data?.length === 0 || data === null ? (
        <PolizasNoItems>
          <Icon iconName="ErrorOutline" size={60} />
          <h3>Sin pólizas</h3>
          <p>Comienza por importar tus polizas desde la herramienta</p>
        </PolizasNoItems>
      ) : (
        <PolizasItems>
          {!isMobile ? (
            <PolizasItemsHeader>
              <p>No. Poliza</p>
              <p>Asegurado principal</p>
              <p>Producto</p>
              <p>Estatus</p>
              <p>Días para corte</p>
              <p></p>
            </PolizasItemsHeader>
          ) : null}
          {data.map((elem) => (
            <PolizaItem
              viewMode={isMobile ? "Mobile" : "Desktop"}
              key={elem.num_poliza}
              data={elem}
              setModalOpen={setIsOpen}
              setPolizaData={setPolizaData}
              notificationsNotifier={notificationsNotifier}
            ></PolizaItem>
          ))}
        </PolizasItems>
      )}
    </PolizasContainerCustom>
  );
};

const PolizasItems = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 5px;
`;

const PolizasItemsHeader = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 50px;
  /* background-color: white; */
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  position: sticky;
  top: 0;
  z-index: 10;
  background: #e3ebfd;

  & p {
    flex: 1;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    ${textTheme__css}
  }
  & p:nth-child(2n) {
    /* background-color: gray; */
  }
`;

const PolizasContainerCustom = styled.div`
  /* min-height: 400px; */
  height: fit-content;
  width: 100%;
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 0px 0;
  /* ${headerTheme} */
  border-radius: 8px;
  height: calc(100vh - 450px);
  overflow-y: auto;
  /* padding: 40px 10px; */
  /* align-items: center; */
  /* border: 1px solid #ababab1f; */
`;

export default PolizasContainer;
