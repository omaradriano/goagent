import styled from "styled-components";
import type { UserMode } from "../Context/ContextConfig";
import { textResponsive__css, textTheme__css } from "../styles/CssComponents";
// import type { PreferedScheme, UserMode } from "../Context/ContextConfig";

export const UserModeTag = styled.span<{ $usertype: UserMode }>`
  color: ${(p) =>
    p.$usertype === "Asegurador"
      ? "var(--text-user-span)"
      : p.$usertype === "Admin"
        ? "var(--text-admin-span)"
        : "var(--text-demo-span)"};
  background-color: ${(p) =>
    p.$usertype === "Asegurador"
      ? "var(--bg-user-span)"
      : p.$usertype === "Admin"
        ? "var(--bg-admin-span)"
        : "var(--bg-demo-span)"};
  padding: 4px 4px;
  border: 1px solid
    ${(p) =>
      p.$usertype === "Asegurador"
        ? "var(--border-user-span)"
        : p.$usertype === "Admin"
          ? "var(--border-admin-span)"
          : "var(--border-demo-span)"};
  border-radius: 3px;
`;

/* export const PolizasNoItems = styled.div<{$the}>` */
export const PolizasNoItems = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 100%;
  padding: 15px 0;

  & h3 {
    font-size: clamp(20px, 1.5vw, 2vw);
    ${textTheme__css}
  }

  & p {
    ${textResponsive__css}
    ${textTheme__css}
  }
`
