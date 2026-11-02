import React from "react";
import styled from "styled-components";
import type { StatusValues } from "../Types/types";

export interface SpanCardProps {
  title: string;
  vigente: boolean;
}

const SpanCard: React.FC<SpanCardProps> = ({ title, vigente }) => {
  return (
    <SpanCardCustom $type={vigente ? "En Vigor" : "Anulada"}>
      <p>{title}</p>
    </SpanCardCustom>
  );
};

// Pildora de estatus (estilo de la presentacion): verde si la poliza esta
// vigente, roja si esta anulada; el texto es el estatus del portal.
const SpanCardCustom = styled.div<{
  $type: StatusValues;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 4px 12px;
  border-radius: 100px;
  background-color: ${(p) =>
    p.$type === "En Vigor"
      ? "var(--ga-pill-success-bg)"
      : "var(--ga-pill-danger-bg)"};

  & > p {
    font-size: 12px;
    font-weight: 600;
    line-height: 1.5;
    white-space: nowrap;
    color: ${(p) =>
      p.$type === "En Vigor" ? "var(--ga-pill-success)" : "var(--ga-pill-danger)"};
  }
`;

export default SpanCard;
