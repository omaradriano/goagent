import React from "react";
import * as MuiIcons from "@mui/icons-material";
import styled from "styled-components";
import { type PreferedScheme } from "../Context/ContextConfig";
import { textTheme__css } from "../styles/CssComponents";
import type { MaterialIconName } from "../Types/types";

export interface IconProps {
  iconName: MaterialIconName;
  customColor?: string;
  size?: number;
  isButton?: boolean;
  action?: () => void;
}

const StyledIconWrapper = styled.span<{
  $scheme?: PreferedScheme;
  $size?: number;
  $isButton: boolean;
  $customColor: string;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;

  height: ${(p) => p.$size}px;
  width: ${(p) => p.$size}px;

  cursor: ${(p) => (p.$isButton ? "pointer" : "initial")};

  & svg {
    ${textTheme__css}
    color: ${(p) => (p.$customColor ? p.$customColor : "")};
    transition: color 0.3s ease;
    height: 100%;
    width: 100%;
  }

  &:hover svg {
    filter: brightness(1.2); /* Efecto visual reactivo */
  }
`;

const Icon: React.FC<IconProps> = ({
  iconName,
  size,
  isButton = false,
  customColor = "",
  action = () => {},
}) => {
  const IconComponent = MuiIcons[iconName];

  if (!IconComponent) return null;

  return (
    <StyledIconWrapper
      $size={size}
      $isButton={isButton}
      $customColor={customColor}
      onClick={action}
    >
      <IconComponent />
    </StyledIconWrapper>
  );
};

export default Icon;
