import React, { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";
import {
  ButtonConf__SC,
  sectionTheme__css,
  sectionBorderTheme__css,
  textTheme__css,
} from "../styles/CssComponents";
import type { CardType } from "../Types/types";
import Icon from "./icon";
import {
  AlertContext,
  DataChangedContext,
  SubscriptionContext,
} from "../Context/ContextConfig";

export interface SpanCardProps {
  label?: string;
  count: number | string;
  includePayment?: boolean;
  paymentdata: {
    poliza: string;
    paid_period: string;
    num_poliza: string;
  };
  parentContainer: "Row" | "Modal" | null;
}

function DefineCounterColor(count: number | string, limit: number): CardType {
  if (typeof count === "string") return "Default";
  if (count <= limit && count > 0) return "Warning";
  if (count <= 0) return "Danger";
  return "Success";
}

const CounterCard: React.FC<SpanCardProps> = ({
  label,
  count,
  paymentdata,
  includePayment = false,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const alertContext = useContext(AlertContext);
  const dataChanged = useContext(DataChangedContext);
  const subscription = useContext(SubscriptionContext);
  const isSubscribed = subscription?.isSubscribed ?? false;

  // Cierra el dropdown solo al hacer click fuera de la card y del dropdown
  useEffect(() => {
    if (!showOptions) return;

    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setShowOptions(false);
    };

    const closeOnce = () => setShowOptions(false);

    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", closeOnce, { once: true });
    window.addEventListener("resize", closeOnce, { once: true });

    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [showOptions]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSubscribed) {
      alertContext?.setAlertOptions({
        title: "Suscripción requerida",
        message: "Necesitas una suscripción activa para registrar pagos.",
        type: "error",
        onConfirm: () => alertContext.setShowAlert(false),
      });
      alertContext?.setShowAlert(true);
      return;
    }
    if (!showOptions && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setShowOptions((prev) => !prev);
  };

  const handleConfirmPayment = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_SERVER_URL}/v1/payments/poliza`,
        {
          method: "PATCH",
          body: JSON.stringify({
            poliza: paymentdata.poliza,
            paid_period: paymentdata.paid_period,
          }),
          headers: {
            Authorization: `Bearer ${localStorage.getItem("session_jwt")}`,
          },
        },
      );
      const res = await response.json();

      if (res.code !== 202) {
        throw new Error(res.message || "Error al procesar el pago");
      }

      dataChanged?.setDataHasChanged((prev) => prev + 1);

      alertContext?.setAlertOptions({
        message: "Se ha completado el pago",
        title: "Pago confirmado",
        type: "success",
        onConfirm: () => alertContext.setShowAlert(false),
      });
      alertContext?.setShowAlert(true);
    } catch (error) {
      alertContext?.setAlertOptions({
        title: "Confirmación de pago",
        message: error instanceof Error ? error.message : "Error desconocido",
        type: "error",
      });
      alertContext?.setShowAlert(true);
    }
  };

  const triggerAlertModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOptions(false);
    alertContext?.setAlertOptions({
      title: "Confirmación de pago",
      message: `¿Desea confirmar pago para la póliza ${paymentdata.num_poliza}?`,
      type: "success",
      onConfirm: handleConfirmPayment,
    });
    alertContext?.setShowAlert(true);
  };

  return (
    <CounterCardCustom
      ref={containerRef}
      $type={!includePayment ? "Default" : DefineCounterColor(count, 5)}
      $disabled={!isSubscribed}
      onClick={handleToggle}
    >
      {!includePayment ? (
        <CardRow>
          {label && <CardLabel>{label}:</CardLabel>}
          <CardCount>{count}</CardCount>
          <Icon iconName="Warning" size={16} isButton customColor="#fb8d0f" />
        </CardRow>
      ) : (
        <CardRow>
          {label && <CardLabel>{label}:</CardLabel>}
          <CardCount>{count}</CardCount>
          <Icon iconName="MoreHoriz" size={16} isButton />
        </CardRow>
      )}

      {showOptions &&
        createPortal(
          <OptionsDropdown
            ref={dropdownRef}
            $top={dropdownPos.top}
            $right={dropdownPos.right}
          >
            <OptionItem onClick={triggerAlertModal}>
              <Icon iconName="Check" size={15} customColor="#22c55e" />
              <span>Marcar como pagado</span>
            </OptionItem>
          </OptionsDropdown>,
          document.body,
        )}
    </CounterCardCustom>
  );
};

// ── Animations ────────────────────────────────────────────────────────────────
const fadeDown = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ── Styles ────────────────────────────────────────────────────────────────────
const CounterCardCustom = styled.div<{ $type: CardType; $disabled?: boolean }>`
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  height: fit-content;
  border-radius: 6px;
  padding: 5px 10px;
  width: fit-content;
  min-width: 75px;
  ${ButtonConf__SC}
  opacity: 0.9;
  cursor: ${(p) => (p.$disabled ? "default" : "pointer")};
  ${textTheme__css}
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: opacity 0.15s;
  opacity: ${(p) => (p.$disabled ? "0.5" : "0.9")};
  filter: ${(p) => (p.$disabled ? "grayscale(0.4)" : "none")};

  &:hover {
    opacity: ${(p) => (p.$disabled ? "0.5" : "1")};
  }
`;

const CardRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: clamp(13px, 1.5vw, 15px);
`;

const CardLabel = styled.span`
  font-size: inherit;
`;

const CardCount = styled.span`
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
`;

const OptionsDropdown = styled.div<{ $top: number; $right: number }>`
  position: fixed;
  top: ${(p) => p.$top}px;
  right: ${(p) => p.$right}px;
  z-index: 9999;
  min-width: 190px;
  border-radius: 10px;
  padding: 5px;
  ${sectionTheme__css}
  ${sectionBorderTheme__css}
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  animation: ${fadeDown} 0.18s ease;
`;

const OptionItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 7px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  ${textTheme__css}
  transition: background 0.15s;
  text-align: left;

  &:hover {
    background: ${(p) =>
      p.theme.mode === "Dark"
        ? "rgba(34, 197, 94, 0.12)"
        : "rgba(34, 197, 94, 0.1)"};
    color: #16a34a;
  }
`;

export default CounterCard;
