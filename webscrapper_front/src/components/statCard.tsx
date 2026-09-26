import React from "react";
import styled from "styled-components";
import type { CardType } from "../Types/types";

export interface StatTagProps {
  amount: number;
  title: string;
  type?: CardType;
  filter?: ()=>void
}

const StatCard: React.FC<StatTagProps> = ({ amount, title, type, filter = ()=>{} }) => {
  return (
    <StatCardCustom $type={type ?? "Warning"} onClick={filter}>
      <h3>{amount}</h3>
      <p>{title}</p>
    </StatCardCustom>
  );
};

// Estilo de la presentacion: tarjeta limpia con el numero grande en el color
// de su estado y la etiqueta en gris debajo (paleta --ga-* en GlobalStyle).
const numberColor = (type: CardType) =>
  type === "Danger"
    ? "var(--ga-red)"
    : type === "Warning"
      ? "var(--ga-orange)"
      : type === "Success"
        ? "var(--ga-green)"
        : "var(--ga-primary)";

const StatCardCustom = styled.div<{ $type: CardType }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1 0 calc(25% - 12px);
  min-width: 150px;
  gap: 4px;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;

  background-color: var(--ga-surface);
  border: 1px solid var(--ga-surface-border);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(21, 93, 252, 0.1);
  }

  h3 {
    margin: 0;
    font-size: 36px;
    font-weight: 700;
    line-height: 1.1;
    color: ${(p) => numberColor(p.$type)};
  }

  p {
    margin: 0;
    font-size: 14px;
    color: var(--ga-muted);
  }
`;

export default StatCard;
