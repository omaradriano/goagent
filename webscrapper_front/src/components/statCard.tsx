import React, { useContext } from "react";
import { ThemeContext, type PreferedScheme } from "../Context/ContextConfig";
import styled from "styled-components";
import type { CardType } from "../Types/types";

export interface StatTagProps {
  amount: number;
  title: string;
  type?: CardType;
  filter?: ()=>void
}

const StatCard: React.FC<StatTagProps> = ({ amount, title, type, filter = ()=>{} }) => {
  const theme = useContext(ThemeContext);

  return (
    <StatCardCustom
      $type={type ?? "Warning"}
      $themeMode={theme?.theme as PreferedScheme}
      onClick={filter}
    >
      <p>{title}</p>
      <h3>{amount}</h3>
    </StatCardCustom>
  );
};

const StatCardCustom = styled.div<{
  $type: CardType;
  $themeMode: PreferedScheme;
}>`

  display: flex;
  flex-direction: column;
  /* flex: 1; */
  flex: 1 0 calc(33.333% - 11px);
  justify-content: space-between;
  align-items: flex-start;
  height: 80px;
  border-radius: 7px;
  padding: 10px;

  cursor: pointer;

  max-width: 280px;

  background-color: ${(p) =>
    p.$type === "Danger"
      ? "var(--sc-danger-bg)"
      : p.$type === "Warning"
        ? "var(--sc-warning-bg)"
        : p.$type === "Success"
          ? "var(--sc-success-bg)"
          : "var(--sc-default-bg)"};

  color: ${(p) =>
    p.$type === "Danger"
      ? "var(--sc-danger-color)"
      : p.$type === "Warning"
        ? "var(--sc-warning-color)"
        : p.$type === "Success"
          ? "var(--sc-success-color)"
          : "var(--sc-default-color)"};

  border: 1px solid var(--sc-border-light);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);

  ${(p) =>
    p.$themeMode === "Dark"
      ? `
    --sc-danger-bg: rgba(255,111,111,0.08);
    --sc-warning-bg: rgba(252,222,123,0.06);
    --sc-success-bg: rgba(115,249,126,0.06);
    --sc-default-bg: #0b1220;

    --sc-danger-color: #ffb4b4;
    --sc-warning-color: #ffe6a8;
    --sc-success-color: #bff0c9;
    --sc-default-color: #e6eef8;

    border: 1px solid var(--sc-border-dark);
    box-shadow: 0 1px 2px rgba(0,0,0,0.6);
  `
  : ""}

  &:hover {
    filter: brightness(1.2)
  }

  h3 {
    margin: 0;
    font-size: 1.4rem;
    line-height: 1;
  }

  p {
    margin: 0;
    font-size: clamp(14px, 1.5vw, 1.2rem);
    opacity: 0.9;
  }
`;

export default StatCard;
