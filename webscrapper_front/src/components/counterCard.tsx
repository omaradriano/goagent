import React from "react";
import styled from "styled-components";
import { ButtonConf__SC, textTheme__css } from "../styles/CssComponents";
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
  return (
    <CounterCardCustom $type={DefineCounterColor(count, 5)}>
      <CardRow>
        {label && <CardLabel>{label}:</CardLabel>}
        <CardCount>{count}</CardCount>
        <Icon iconName="Warning" size={16} isButton customColor="#fb8d0f" />
      </CardRow>
    </CounterCardCustom>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const CounterCardCustom = styled.div<{ $type: CardType }>`
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
  ${textTheme__css}
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: opacity 0.15s;

  &:hover {
    opacity: 1;
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

export default CounterCard;
