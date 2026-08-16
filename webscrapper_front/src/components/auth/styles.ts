import styled from "styled-components";
import { FlexColumn__SC } from "../../styles/CssComponents";
import Button from "../button";

const InputText = styled.div`
  ${FlexColumn__SC}
  gap: 6px;

  & > p {
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 0.2px;
  }

  & > input[type="text"],
  & > input[type="password"],
  & > input[type="number"],
  & > select {
    border-radius: 8px;
    outline: none;
    border: 1.5px solid #e2e8f0;
    height: 44px;
    padding: 0 14px;
    font-size: 15px;
    font-family: inherit;
    background-color: #f8fafc;
    color: #0f172a;
    transition: border-color 0.18s ease, box-shadow 0.18s ease,
      background-color 0.18s ease;
    width: 100%;

    &::placeholder {
      color: #b0bec5;
    }

    &:focus {
      border-color: #155dfc;
      background-color: #fff;
      box-shadow: 0 0 0 3px rgba(21, 93, 252, 0.12);
    }

    &:hover:not(:focus) {
      border-color: #94a3b8;
    }
  }

  & > select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 38px;
    cursor: pointer;
  }

  & > input[type="number"]::-webkit-inner-spin-button,
  & > input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const CredentialAlert = styled.div<{ $valid: boolean }>`
  height: fit-content;
  flex: 1;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.55;

  background-color: ${(p) =>
    p.$valid ? "rgba(34, 197, 94, 0.07)" : "rgba(239, 68, 68, 0.07)"};

  border: 1px solid
    ${(p) =>
      p.$valid ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.35)"};

  color: ${(p) => (p.$valid ? "rgb(21, 128, 61)" : "rgb(200, 40, 40)")};

  & > ul {
    margin: 6px 0 0 18px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  & > p {
    font-weight: 500;
  }
`;

const AuthButton = styled(Button)`
  width: 100% !important;
  height: 44px !important;
  border-radius: 8px !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  margin-top: 6px;
`;

export { InputText, CredentialAlert, AuthButton };
