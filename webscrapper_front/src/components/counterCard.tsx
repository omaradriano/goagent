import React from "react";
import styled from "styled-components";
import type { CardType } from "../Types/types";
import Icon from "./icon";

export interface SpanCardProps {
  label?: string;
  count: number | string;
  parentContainer: "Row" | "Modal" | null;
}

function DefineCounterColor(count: number | string, limit: number): CardType {
  if (typeof count === "string") return "Default";
  if (count <= limit && count > 0) return "Warning";
  if (count <= 0) return "Danger";
  return "Success";
}

const CounterCard: React.FC<SpanCardProps> = ({ label, count }) => {
  const type = DefineCounterColor(count, 5);
  return (
    <CounterCardCustom $type={type}>
      <CardRow>
        {label && <CardLabel>{label}:</CardLabel>}
        <CardCount>{count}</CardCount>
        {/* El aviso solo aplica cuando el corte esta cerca o ya paso. */}
        {(type === "Warning" || type === "Danger") && (
          <Icon iconName="Warning" size={16} isButton customColor="currentColor" />
        )}
      </CardRow>
    </CounterCardCustom>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
// Pildora con tinte suave (estilo de la presentacion): verde si falta tiempo,
// naranja si el corte esta cerca, roja si ya paso.
const pillBg = (type: CardType) =>
  type === "Danger"
    ? "var(--ga-pill-danger-bg)"
    : type === "Warning"
      ? "var(--ga-pill-warning-bg)"
      : type === "Success"
        ? "var(--ga-pill-success-bg)"
        : "var(--ga-surface-soft)";

const pillColor = (type: CardType) =>
  type === "Danger"
    ? "var(--ga-pill-danger)"
    : type === "Warning"
      ? "var(--ga-pill-warning)"
      : type === "Success"
        ? "var(--ga-pill-success)"
        : "var(--ga-muted)";

const CounterCardCustom = styled.div<{ $type: CardType }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-width: 64px;
  padding: 4px 12px;
  border-radius: 100px;
  background-color: ${(p) => pillBg(p.$type)};
  color: ${(p) => pillColor(p.$type)};
`;

const CardRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  white-space: nowrap;
`;

const CardLabel = styled.span`
  font-size: inherit;
`;

const CardCount = styled.span`
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
`;

export default CounterCard;
