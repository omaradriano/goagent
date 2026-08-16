import React, { useContext, useState } from "react";
import styled from "styled-components";
import Icon from "./icon";
import { ThemeContext } from "../Context/ContextConfig";

const ThemeToggle: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const themeContext = useContext(ThemeContext)

  return (
    <Toggle $isActive={isActive} onClick={() => {
      setIsActive(!isActive)
      themeContext?.setTheme(isActive ? 'Dark' : 'Light')
      if(isActive){
        localStorage.setItem('themeMode', 'Dark')
        setIsActive(false)
      }else{
        localStorage.setItem('themeMode', 'Light')
        setIsActive(true)
      }
    }}>
      <Scroll $isActive={isActive}>
        {isActive ? (
          <Icon iconName="Sunny" size={24} customColor="var(--theme-color-light)"></Icon>
        ) : (
          <Icon iconName="Bedtime" size={24} customColor="var(--theme-color-dark)"></Icon>
        )}
      </Scroll>
    </Toggle>
  );
};

const Toggle = styled.div<{ $isActive: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  /* justify-content: center; */
  height: 28px;
  width: 50px;
  padding: 0px 5px;
  border-radius: 18px;
  background-color: ${(p) => (p.$isActive ? "var(--theme-color-dark)" : "var(--theme-color-light)")};
  position: relative;
  cursor: pointer;
`;

const Scroll = styled.span<{ $isActive: boolean }>`
  position: absolute;
  left: ${(p) => (p.$isActive ? "25px" : "5px")};
  height: 20px;
  width: 20px;
  border-radius: 50%;
  transition: 0.1s linear;
  display: flex;
  align-items: center;
`;

export default ThemeToggle;
