import { createGlobalStyle } from "styled-components";
import type { PreferedScheme } from "../Context/ContextConfig";

const GlobalStyle = createGlobalStyle<{ $theme: PreferedScheme }>`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: "SN Pro", sans-serif;
  }

  :root {

    /** HEADER COLORS */
    --bg-dark-header: #1d293d;
    --bg-light-header: #fff;

    /** BODY COLORS */
    --bg-dark-body: #0f172b;
    --bg-light-body: #e3ebfd;

    /** SPAN USER MODE COLORS */
    --bg-user-span: #004452ff;
    --border-user-span: #00b4d8ff;
    --text-user-span: #00b4d8ff;

    /** SPAN ADMIN MODE COLORS */
    --bg-admin-span: #9c4b00ff;
    --border-admin-span: #fe9c40ff;
    --text-admin-span: #fe9c40ff;

    /** SPAN DEMO MODE COLORS */
    --bg-demo-span: #606060ff;
    --border-demo-span: #cacacaff;
    --text-demo-span: #cacacaff;

    /** BORDER COLORS */
    --border-shadow-dark: #ffffff2e;
    --border-shadow-light: #00000044;

    /** Bordes para secciones */
    --sc-border-light: rgba(255, 255, 255, 0.52);
    --sc-border-dark: rgba(255, 255, 255, 0.06);

    /** Colores para tarjetas / span en LIGHT MODE */
    --sc-danger-bg: #ff6f6fa3;
    --sc-warning-bg: #fcde7b95;
    --sc-success-bg: #73f97e57;
    --sc-default-bg: #f6f8fb;

    --sc-danger-color: #7a0b0b;
    --sc-warning-color: #7a5b00;
    --sc-success-color: #0b6b3d;
    --sc-default-color: #0f1720;

    /** Colores para tarjetas / span en DARK MODE */
    --sc-danger-bg-dark: rgba(255,111,111,0.08);
    --sc-warning-bg-dark: rgba(252,222,123,0.06);
    --sc-success-bg-dark: rgba(115,249,126,0.06);
    --sc-default-bg-dark: #0b1220;

    --sc-danger-color-dark: #ffb4b4;
    --sc-warning-color-dark: #ffe6a8;
    --sc-success-color-dark: #bff0c9;
    --sc-default-color-dark: #e6eef8;
    --sc-warning-color-defaultBlue: #155dfc;

    --theme-color-dark: #121212;
    --theme-color-light: #F9FAFB;

    /** Colores para botones */
    //Default Dark
    --btn-dark-bg: #0b1220;
    --btn-dark-color: #f9fafb;
    //Default Light
    --btn-light-bg: #dadada;
    --btn-light-color: #1e2939;
  }

  #root {
    background-color: ${(p) =>
      p.$theme === "Dark" ? "var(--bg-dark-body)" : "var(--bg-light-body)"};
    min-height: 100vh
  }
`;

export default GlobalStyle;
