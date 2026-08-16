import styled, { css } from "styled-components";
import type { PreferedScheme } from "../Context/ContextConfig";
import type { CardType, StatusValues } from "../Types/types";

export const textResponsive__css = css`
  font-size: clamp(14px, 1.5vw, 1.2rem);
`;

export const textTheme__css = css`
  color: ${(p) => getThemeTextColor(p.theme.mode)};
`;

export const headerTheme = css`
  background-color: ${(p) => getHeaderTheme(p.theme.mode)};
`;

/** Borde shadow para el header */
export const borderTheme__css = css`
  box-shadow: 0 1px 1px ${(p) => getHeaderBorderTheme(p.theme.mode)};
`;

/** Se usa para construccion de secciones
 * Tarjetas, es el mismo color que el header
 */
export const sectionTheme__css = css`
  background-color: ${(p) => getBaseSectionColor(p.theme.mode)};
`;

/** Este se usa en conjunto con sectionTheme__css para agregar el borde */
export const sectionBorderTheme__css = css`
  border: 1px solid ${(p) => getBaseBorderColor(p.theme.mode)};
`;

export const getThemeTextColor = ($scheme: PreferedScheme) =>
  $scheme === "Dark" ? "#fff" : "black";

export const getBaseSectionColor = ($scheme: PreferedScheme) =>
  $scheme === "Dark" ? "var(--bg-dark-header)" : "#fff";

export const getBaseBorderColor = ($scheme: PreferedScheme) =>
  $scheme === "Dark" ? "var(--sc-border-dark)" : "var(---sc-border-dark)";

/** Estilos para header */
export const getHeaderTheme = ($scheme: PreferedScheme) =>
  $scheme === "Dark" ? "var(--bg-dark-header)" : "var(--bg-light-header)";

/** Box shadow para algunos componentes */
export const getHeaderBorderTheme = ($scheme: PreferedScheme) =>
  $scheme === "Dark"
    ? "var(--border-shadow-dark)"
    : "var(--border-shadow-light)";
// export const getDefaultButtonBorderTheme = ($scheme: PreferedScheme) =>
//   $scheme === "Dark"
//     ? "var(--btn-dark-color)"
//     : "var(--btn-light-color)";

/** Se usa para titulos pequeños
 * Como titulos de secciones pequeñas, tarjetas
 */
export const MayorText = styled.p`
  ${textTheme__css}
  font-size: 20px;
  font-weight: 600;
`;

/** Texto de descripcion, esos que tienen color gris */
export const MinorText = styled.p`
  font-size: 14px;
  color: #a9a9a9;
`;

/** El texto mas normal, hay que adaptar este para el tamaño de pantalla */
export const NormalText = styled.p`
  font-size: 16px;
  ${textTheme__css}
`;

/** CONFIGURACION PARA CARTAS SPAN O CARD */
// MARK: CARD / SPAN
export const spanTheme__css = css`
  ${(p) => getSuccessBgByTheme(p.theme.mode)};
`;
export const spanTextTheme__css = css`
  ${(p) => getSuccessTextByTheme(p.theme.mode)};
`;

export const CardTextTheme__CSS = css<{ $type: StatusValues }>`
  color: ${(p) =>
    p.$type === "En Vigor"
      ? "var(--sc-success-color)"
      : "var(--sc-danger-color)"};
  ${spanTextTheme__css}
`;

export const CardTheme__CSS = css<{ $type: StatusValues }>`
  background-color: ${(p) =>
    p.$type === "En Vigor" ? "var(--sc-success-bg)" : "var(--sc-danger-bg)"};
  ${spanTheme__css}
`;

export const getSuccessBgByTheme = ($scheme: PreferedScheme) =>
  $scheme === "Dark"
    ? `--sc-success-bg: var(--sc-success-bg-dark);
                        --sc-danger-bg: var(--sc-danger-bg-dark);`
    : "";

export const getSuccessTextByTheme = ($scheme: PreferedScheme) =>
  $scheme === "Dark"
    ? `--sc-success-color: var(--sc-success-color-dark);
       --sc-danger-color: var(--sc-danger-color-dark);`
    : "";

// MARK: BUTTON

/** Configuracion para estilos de botón */
export const ButtonConf__SC = css<{ $type: CardType }>`
  /** Se hace una declaracion de los colores que se van a usar
para el componente */
  display: flex;
  flex-direction: row;
  align-items: center;
  opacity: 1;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  background-color: ${(p) =>
    p.$type === "Success"
      ? `var(--sc-success-color-dark)`
      : p.$type === "Danger"
        ? `var(--sc-danger-color-dark)`
        : p.$type === "Warning"
          ? `var(--sc-warning-color-dark)`
          : p.$type === "DefaultBlue"
            ? `var(--sc-warning-color-defaultBlue)`
            : `var(--sc-default-color-dark)`};
  /** Se sobreescriben los colores por el modo en el que estamos */
  ${(p) =>
    p.theme.mode === "Dark"
      ? `
        --sc-success-color-dark: var(--sc-success-color);
        --sc-warning-color-dark: var(--sc-warning-color);
        --sc-danger-color-dark: var(--sc-danger-color);
        --sc-default-color-dark: var(--sc-default-color);
      `
      : null}

  &:hover {
    opacity: 1;
  }
`;

//MARK: FLEXBOX
export const FlexColumn__SC = css`
  display: flex;
  flex-direction: column;
`;
export const FlexRow__SC = css`
  display: flex;
  flex-direction: row;
`;

//MARK: COMPS

export const CardComponent__SC = css`
  ${textTheme__css}
  background-color: ${(p) =>
    p.theme.mode === "Dark" ? `var(--bg-dark-header)` : `#fff`};
  border-radius: 8px;
  padding: 20px 30px;
  height: fit-content;
  border: 1px solid
    ${(p) =>
      p.theme.mode === "Dark"
        ? "var(--border-shadow-dark)"
        : "var(--border-shadow-light)"};
`;

export const InputText__SC = css`

`

//MARK: AUX

export const Link__SC = css`
  color: var(--sc-warning-color-defaultBlue);
  cursor: pointer;
  transition: 0.3s ease;
  &:hover {
    color: white;
    border-bottom: 1px solid #fff;
  }
`;
