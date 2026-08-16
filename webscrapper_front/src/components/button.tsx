import React from "react";
import type { CardType, MaterialIconName } from "../Types/types";
import styled from "styled-components";
import Icon from "./icon";
import { ButtonConf__SC, textTheme__css } from "../styles/CssComponents";

export interface ButtonProps {
  label: string;
  iconName?: MaterialIconName;
  disabled?: boolean
  action?: () => void;
  type?: CardType;
  customStyle?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({
  label = "Default",
  iconName,
  type = "Default",
  disabled = false,
  action = () => {},
  customStyle = {}
}) => {
  return (
    <BaseButtonCustom $disabled={disabled} $type={type} onClick={()=>{
      if(!disabled) action()
    }} style={customStyle}>
      <p>{label}</p>
      {iconName && <Icon iconName={iconName} size={24} isButton={true}></Icon>}
    </BaseButtonCustom>
  );
};

const BaseButtonCustom = styled.div<{ $type: CardType, $disabled: boolean }>`
  ${ButtonConf__SC}

  gap: 5px;
  width: fit-content;
  transition: 0.2s linear;

  & > p {
    ${textTheme__css}
  }

  opacity: ${p => p.$disabled ? '0.6' : '1'};
  cursor: ${p => p.$disabled ? 'default' : 'pointer'};
  &:hover {
    opacity: ${p => p.$disabled ? '0.6' : '1'};
  }
`;

export default Button;
