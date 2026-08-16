import React from "react";
import type { PolizaGetItem, StatusValues, viewMode } from "../Types/types";
import styled from "styled-components";
// import ScrollCheckbox from "./checkboxscroll";
import {
  MayorText,
  MinorText,
  NormalText,
  sectionBorderTheme__css,
  sectionTheme__css,
  textTheme__css,
} from "../styles/CssComponents";
import Button from "./button";
import SpanCard from "./spanCard";
import CounterCard from "./counterCard.js";
import { calculateDaysUntilLimit } from "../functions/globalFunctions";

export interface PolizaItemProps {
  data: PolizaGetItem;
  viewMode?: viewMode;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPolizaData: React.Dispatch<React.SetStateAction<PolizaGetItem>>;
  notificationsNotifier: {
    stateAction: React.Dispatch<React.SetStateAction<PolizaGetItem[]>>;
    stateValue: PolizaGetItem[];
  };
}

const PolizaItem: React.FC<PolizaItemProps> = ({
  data,
  viewMode = "Mobile",
  setModalOpen,
  setPolizaData,
  // notificationsNotifier
}) => {

  // console.log(data);
  return (
    <>
      {viewMode === "Mobile" ? (
        <PolizaItemCustom $viewMode={viewMode}>
          <PolizaItemHeader>
            <MayorText>{data.num_poliza}</MayorText>
            <div>
              <CounterCard
                parentContainer="Row"
                includePayment={data.payment_exist === "" ? false : true}
                label={"Días para corte"}
                count={calculateDaysUntilLimit(data.next_payment)}
                paymentdata={{
                  poliza: data.poliza_uuid,
                  paid_period: data.next_payment,
                  num_poliza: data.num_poliza,
                }}
              ></CounterCard>

              {/* <ScrollCheckbox active={data.allownotifications} /> */}
            </div>
          </PolizaItemHeader>
          <div>
            <MinorText>Producto:</MinorText>
            <NormalText>{data.tipo_seguro}</NormalText>
            <MinorText>ASegurado principal:</MinorText>
            <NormalText>{data.asegurados[0]?.nombre}</NormalText>
          </div>
          <PolizaItemFooter>
            <SpanCard title={data.estatus}></SpanCard>
            <Button
              action={() => {
                setPolizaData(data);
                setModalOpen(true);
              }}
              label="Detalles"
              iconName="ChevronRight"
            />
          </PolizaItemFooter>
        </PolizaItemCustom>
      ) : (
        <PolizaItemCustom $viewMode={viewMode}>
          <p>{data.num_poliza}</p>
          <p>{data.asegurados[0]?.nombre}</p>
          <p>{data.tipo_seguro}</p>
          <div>
            <SpanCard title={data.estatus as StatusValues} />
          </div>
          <NotificationDiv>
            <CounterCard
              parentContainer="Row"
              includePayment={data.payment_exist === "" ? false : true}
              count={calculateDaysUntilLimit(data.next_payment)}
              paymentdata={{
                poliza: data.poliza_uuid,
                paid_period: data.next_payment,
                num_poliza: data.num_poliza,
              }}
            ></CounterCard>
            {/* <ScrollCheckbox active={data.allownotifications} action={()=>{
              // notificationsNotifier.stateAction
              console.log(`ha cambiado el estado del elemento ${data.numPoliza}`);
            }}/> */}
          </NotificationDiv>
          <div>
            <Button
              label="Detalle"
              iconName="ChevronRight"
              action={() => {
                setPolizaData(data);
                setModalOpen(true);
              }}
            />
          </div>
        </PolizaItemCustom>
      )}
    </>
  );
};

const NotificationDiv = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 10px 0;

  ${textTheme__css}
`;

const PolizaItemFooter = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 10px 0 5px 0;
`;

const PolizaItemCustom = styled.div<{ $viewMode: viewMode }>`
  display: flex;
  flex-direction: ${(p) => (p.$viewMode === "Mobile" ? "column" : "row")};
  align-items: ${(p) => (p.$viewMode === "Mobile" ? "" : "center")};
  text-align: ${(p) => (p.$viewMode === "Mobile" ? "" : "center")};
  ${sectionTheme__css}
  border-radius: 8px;
  /* height: 90px; */
  padding: 8px 10px;
  ${sectionBorderTheme__css}

  & > p {
    flex: ${(p) => (p.$viewMode === "Mobile" ? "" : "1")};
    ${textTheme__css}
  }

  & > div {
    ${(p) =>
      p.$viewMode === "Desktop"
        ? `
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
          `
        : ``}
  }

  & > p:nth-child(1) {
    overflow: hidden;
    /* white-space: nowrap; */
    text-overflow: ellipsis;
  }
`;

const PolizaItemHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  /* background-color: purple; */

  & > div {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
  }
`;

export default PolizaItem;
