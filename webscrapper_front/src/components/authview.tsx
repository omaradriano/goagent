import React, { useContext } from "react";
import { useSearchParams } from "react-router";
import styled from "styled-components";
import { ThemeContext, type PreferedScheme } from "../Context/ContextConfig";

// Importación de sub-formularios
import SignInForm from "./auth/SignInForm";
import SignUpForm from "./auth/SignUpForm";
import SetPasswordForm from "./auth/SetPasswordForm";
import ResetPasswordMail from "./auth/ResetPasswordMail";

export type AuthMode =
  | "SignIn"
  | "SignUp"
  | "SetPassword"
  | "LoggedIn"
  | "EmailSended"
  | "Verified"
  | "ResetPassword"
  | "ResetPasswordCompleted"
  | "RegisterCompleted"
  | "ResetPasswordInitFlow"
  | "ResetPasswordEmailSended";

export interface AuthProps {
  test?: string;
  mode: AuthMode;
}

const displayMessages: Record<AuthMode, { title: string; subtitle: string }> = {
  SignIn: {
    title: "Bienvenido de nuevo",
    subtitle: "Inicia sesión para acceder a tu cuenta",
  },
  SignUp: {
    title: "Crea tu cuenta",
    subtitle: "Regístrate para comenzar a gestionar tus pólizas",
  },
  SetPassword: {
    title: "Establece tu contraseña",
    subtitle: "Elige una contraseña segura para tu cuenta",
  },
  LoggedIn: {
    title: "Sesión iniciada",
    subtitle: "Acceso concedido correctamente",
  },
  EmailSended: {
    title: "Revisa tu correo",
    subtitle: "Te enviamos un enlace de confirmación",
  },
  ResetPassword: {
    title: "Nueva contraseña",
    subtitle: "Establece tu nueva contraseña de acceso",
  },
  ResetPasswordCompleted: {
    title: "Contraseña actualizada",
    subtitle: "Ya puedes iniciar sesión con tu nueva contraseña",
  },
  Verified: {
    title: "Verificación de cuenta",
    subtitle: "Confirmación de tu dirección de correo",
  },
  RegisterCompleted: {
    title: "Registro completado",
    subtitle: "Ya puedes usar la plataforma y la extensión",
  },
  ResetPasswordInitFlow: {
    title: "Restablecer contraseña",
    subtitle: "Te enviaremos un enlace para recuperar tu acceso",
  },
  ResetPasswordEmailSended: {
    title: "Correo enviado",
    subtitle: "Revisa tu bandeja de entrada para continuar",
  },
};

const AuthView: React.FC<AuthProps> = ({ mode = "SignIn" }) => {
  const [searchParams] = useSearchParams();
  const theme = useContext(ThemeContext);

  const tokenParam = searchParams.get("token") ?? null;
  const setpasswordParam = searchParams.get("setpasswordmode") ?? null;
  const verifiedAccountStatus = searchParams.get("status") ?? "unset";

  const { title, subtitle } = displayMessages[mode];

  const renderContent = () => {
    switch (mode) {
      case "SignIn":
        return <SignInForm />;
      case "SignUp":
        return <SignUpForm />;
      case "ResetPasswordInitFlow":
        return <ResetPasswordMail />;
      case "SetPassword":
      case "ResetPassword":
        return (
          <SetPasswordForm
            setPasswordMode={setpasswordParam}
            token={tokenParam}
          />
        );
      case "LoggedIn":
        return (
          <StatusMessage>
            Sesión iniciada con éxito. Ahora puede usar su extensión.
          </StatusMessage>
        );
      case "RegisterCompleted":
        return (
          <StatusMessage>
            Registro completado con éxito. Ahora puede usar su extensión y
            plataforma web.
          </StatusMessage>
        );
      case "ResetPasswordEmailSended":
        return (
          <StatusMessage>
            Se ha enviado un correo para restablecer la contraseña. Revise su
            correo electrónico.
          </StatusMessage>
        );
      case "EmailSended":
        return (
          <StatusMessage>
            Se ha enviado un correo para verificar la cuenta. Revise su correo
            electrónico.
          </StatusMessage>
        );
      case "ResetPasswordCompleted":
        return (
          <StatusMessage>
            La contraseña ha sido restablecida con éxito. Ahora puede iniciar
            sesión.
          </StatusMessage>
        );
      case "Verified":
        return verifiedAccountStatus === "success" ? (
          <StatusMessage>
            La cuenta ha sido confirmada. Ahora puede iniciar sesión.
          </StatusMessage>
        ) : (
          <StatusMessage $error>El token no existe o expiró.</StatusMessage>
        );
      default:
        return null;
    }
  };

  return (
    <AuthWrapper $theme={theme?.theme as PreferedScheme}>
      {/* Left brand panel */}
      <BrandPanel>
        <BrandContent>
          <BrandLogo>
            <BrandLogoMark />
          </BrandLogo>
          <BrandHeadline>Gestiona tus pólizas con confianza</BrandHeadline>
          <BrandBody>
            Plataforma web para asesores de seguros. Visualiza, filtra y
            gestiona el estado de tus pólizas en un solo lugar.
          </BrandBody>
          <BrandPillsRow>
            <BrandPill>Pólizas activas</BrandPill>
            <BrandPill>Vencimientos</BrandPill>
            <BrandPill>Cobranza</BrandPill>
          </BrandPillsRow>
        </BrandContent>
        <BrandPattern aria-hidden="true" />
      </BrandPanel>

      {/* Right form panel */}
      <FormPanel $theme={theme?.theme as PreferedScheme}>
        <FormCard $theme={theme?.theme as PreferedScheme}>
          <FormHeader>
            <FormTitle $theme={theme?.theme as PreferedScheme}>{title}</FormTitle>
            <FormSubtitle>{subtitle}</FormSubtitle>
          </FormHeader>
          <FormBody>{renderContent()}</FormBody>
        </FormCard>
      </FormPanel>
    </AuthWrapper>
  );
};

// --- ESTILOS ---

const AuthWrapper = styled.div<{ $theme: PreferedScheme }>`
  display: flex;
  min-height: calc(100vh - 60px);
  width: 100%;
  background-color: ${(p) =>
    p.$theme === "Dark" ? "var(--bg-dark-body)" : "var(--bg-light-body)"};
`;

/* Left brand panel */
const BrandPanel = styled.div`
  display: none;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0f2049 0%, #155dfc 100%);

  @media (min-width: 900px) {
    display: flex;
    flex: 0 0 42%;
    flex-direction: column;
    justify-content: center;
    padding: 60px 52px;
  }
`;

const BrandContent = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const BrandLogo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
`;

const BrandLogoMark = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  border: 1.5px solid rgba(255, 255, 255, 0.35);
`;

const BrandHeadline = styled.h1`
  font-size: clamp(22px, 2.4vw, 32px);
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
  letter-spacing: -0.3px;
`;

const BrandBody = styled.p`
  font-size: 15px;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.65;
  max-width: 360px;
`;

const BrandPillsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

const BrandPill = styled.span`
  padding: 5px 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 500;
`;

const BrandPattern = styled.div`
  position: absolute;
  bottom: -80px;
  right: -80px;
  width: 340px;
  height: 340px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.07) 0%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 1;
`;

/* Right form panel */
const FormPanel = styled.div<{ $theme: PreferedScheme }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background-color: ${(p) =>
    p.$theme === "Dark" ? "var(--bg-dark-body)" : "var(--bg-light-body)"};
`;

const FormCard = styled.div<{ $theme: PreferedScheme }>`
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  background-color: ${(p) =>
    p.$theme === "Dark" ? "var(--bg-dark-header)" : "#ffffff"};
  border: 1px solid
    ${(p) =>
      p.$theme === "Dark"
        ? "rgba(255,255,255,0.07)"
        : "rgba(0,0,0,0.08)"};
  border-radius: 16px;
  padding: 40px 36px;
  box-shadow: ${(p) =>
    p.$theme === "Dark"
      ? "0 4px 32px rgba(0,0,0,0.5)"
      : "0 4px 32px rgba(0,0,0,0.08)"};
`;

const FormHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FormTitle = styled.h2<{ $theme: PreferedScheme }>`
  font-size: 22px;
  font-weight: 700;
  color: ${(p) => (p.$theme === "Dark" ? "#f1f5f9" : "#0f1720")};
  letter-spacing: -0.2px;
`;

const FormSubtitle = styled.p`
  font-size: 14px;
  color: #8a9ab0;
`;

const FormBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const StatusMessage = styled.p<{ $error?: boolean }>`
  font-size: 15px;
  line-height: 1.6;
  padding: 14px 16px;
  border-radius: 10px;
  background-color: ${(p) =>
    p.$error ? "rgba(239,68,68,0.08)" : "rgba(21,93,252,0.08)"};
  border: 1px solid
    ${(p) =>
      p.$error ? "rgba(239,68,68,0.25)" : "rgba(21,93,252,0.25)"};
  color: ${(p) => (p.$error ? "#e33c3c" : "#155dfc")};
`;

export default AuthView;
