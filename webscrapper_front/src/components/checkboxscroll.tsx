import React, { useState } from "react";
import styled from "styled-components";

export interface ScrollcheckProps {
  action?: () => void;
  active: boolean;
}

const ScrollCheckbox: React.FC<ScrollcheckProps> = ({
  active = false,
  action = () => {},
}) => {
  const [isActive, setIsActive] = useState(active);

  return (
    <ScrollCheckCustom
      $isActive={isActive}
      onClick={() => {
        setIsActive(!isActive)
        action()
      }}
    >
      <Scroll $isActive={isActive}/>
    </ScrollCheckCustom>
  );
};

const ScrollCheckCustom = styled.div<{ $isActive: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  /* justify-content: center; */
  height: 28px;
  width: 50px;
  padding: 0px 5px;
  border-radius: 18px;
  background-color: ${(p) => (p.$isActive ? "green" : "gray")};
  position: relative;
  cursor: pointer;
`;

const Scroll = styled.span<{ $isActive: boolean }>`
  position: absolute;
  left: ${(p) => (p.$isActive ? "25px" : "5px")};
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background-color: white;
  transition: 0.1s linear;
`;

export default ScrollCheckbox;
