import React from "react";
import styled from "styled-components";
import type { StatusValues } from "../Types/types";
import { CardTextTheme__CSS, CardTheme__CSS } from "../styles/CssComponents";

export interface SpanCardProps {
  title: StatusValues;
}

const SpanCard: React.FC<SpanCardProps> = ({ title }) => {
  return (
    <SpanCardCustom $type={title}>
      <p>{title}</p>
    </SpanCardCustom>
  );
};

const SpanCardCustom = styled.div<{
  $type: StatusValues;
}>`
  display: flex;
  flex-direction: row;
  /* flex: 1; */
  align-items: center;
  height: fit-content;
  justify-content: center;
  border-radius: 6px;
  padding: 5px 10px;
  width: fit-content;

  ${CardTheme__CSS}
  /* border: 0.1rem solid var(--sc-success-color); */

  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);

  & > p {
    display: flex;
    align-items: center;
    font-size: clamp(14px, 1.5vw, 1rem);
    height: 24px;
    ${CardTextTheme__CSS}
  }
`;

export default SpanCard;
