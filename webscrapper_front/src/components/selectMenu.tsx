import React from "react";
import styled from "styled-components";
import Icon from "./icon";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/animate-ui/components/radix/dropdown-menu";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  disabled?: boolean;
}

// Animate UI no tiene Select: se arma con su Dropdown Menu de opciones tipo
// radio. El menu va en un portal, asi que necesita un z-index mayor que el de
// los modales (1000) y los colores --ga-* (los tokens de shadcn no tienen
// variante oscura). --accent es el resaltado animado de la opcion.
const CONTENT_CLASS =
  "z-[1100] max-h-64 min-w-(--radix-dropdown-menu-trigger-width) border-solid border-[var(--ga-surface-border)] bg-[var(--ga-surface)] text-[var(--ga-text)] rounded-lg";
const ITEM_CLASS = "cursor-pointer text-[13px]";
const CONTENT_STYLE = {
  "--accent": "rgba(21, 93, 252, 0.1)",
  "--accent-foreground": "var(--ga-text)",
} as React.CSSProperties;

const SelectMenu: React.FC<SelectMenuProps> = ({
  value,
  options,
  onChange,
  placeholder = "Selecciona",
  ariaLabel,
  disabled = false,
}) => {
  const selected = options.find((o) => o.value === value);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Trigger type="button" aria-label={ariaLabel} $empty={!selected}>
          <span>{selected?.label ?? placeholder}</span>
          <Icon iconName="ExpandMore" size={18} customColor="var(--ga-muted)" />
        </Trigger>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={CONTENT_CLASS} style={CONTENT_STYLE}>
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value} className={ITEM_CLASS}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Mismo aspecto que los inputs del formulario (fondo gris calido y borde
// sutil).
const Trigger = styled.button<{ $empty: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  height: 36px;
  padding: 0 8px 0 10px;
  border-radius: 8px;
  border: 1px solid var(--ga-surface-border);
  background-color: var(--ga-surface-soft);
  color: ${(p) => (p.$empty ? "var(--ga-muted)" : "var(--ga-text)")};
  font-family: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;

  & > span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:focus-visible,
  &[data-state="open"] {
    border-color: var(--ga-primary);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

export default SelectMenu;
